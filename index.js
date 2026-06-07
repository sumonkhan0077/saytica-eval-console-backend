const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.abef6se.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send(" server is running ");
});

async function run() {
  try {
    await client.connect();

    const db = client.db("saytica_eval_console");
    const tasksCollection = db.collection("tasks");
    const modelsCollection = db.collection("models");

    // post tasks
    app.post("/tasks", async (req, res) => {
      try {
        const newTask = req.body;

        // basic validation (optional but good)
        if (!newTask.title) {
          return res.status(400).json({
            success: false,
            message: "Title is required",
          });
        }

        // insert task
        const result = await tasksCollection.insertOne({
          ...newTask,
          status: "todo",
          createdAt: new Date(),
        });

        res.status(201).json({
          success: true,
          message: "Task created successfully",
          result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Failed to create task",
          error: error.message,
        });
      }
    });

    app.get("/tasks", async (req, res) => {
      try {
        const tasks = await tasksCollection.find().toArray();

        res.send(tasks);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to get tasks",
          error: error.message,
        });
      }
    });

    app.patch("/tasks/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;

        const filter = { _id: new ObjectId(id) };

        const updateDoc = {
          $set: updateData,
        };

        const result = await tasksCollection.updateOne(filter, updateDoc);

        res.send({
          success: true,
          message: "Task updated successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to update task",
          error: error.message,
        });
      }
    });

    // post models
    app.post("/models", async (req, res) => {
      try {
        const newModel = req.body;

        // basic validation
        if (!newModel.name || !newModel.provider) {
          return res.status(400).json({
            success: false,
            message: "name and provider are required",
          });
        }

        const result = await modelsCollection.insertOne({
          ...newModel,
          evaluatedAt: new Date(),
        });

        res.status(201).json({
          success: true,
          message: "Model added successfully",
          result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Failed to add model",
          error: error.message,
        });
      }
    });

    app.get("/models", async (req, res) => {
      try {
        const { search, sortBy, order } = req.query;

        //  SEARCH name + provider letter matching
        let query = {};

        if (search) {
          query = {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { provider: { $regex: search, $options: "i" } },
            ],
          };
        }

        let sortQuery = {};

        if (sortBy) {
          const sortOrder = order === "desc" ? -1 : 1;

          // allowed sort fields
          const allowedFields = [
            "name",
            "provider",
            "accuracy",
            "latencyMs",
            "costPer1k",
            "evaluatedAt",
          ];

          if (allowedFields.includes(sortBy)) {
            sortQuery[sortBy] = sortOrder;
          }
        }

        const models = await modelsCollection
          .find(query)
          .sort(sortQuery)
          .toArray();

        res.send(models);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to get models",
          error: error.message,
        });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    //  await client.close();
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
