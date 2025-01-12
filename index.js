const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sxexa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    console.log("Connected to MongoDB!");

    const menuCollection = client.db("Bistro-boss").collection('menu');
    const usersCollection = client.db("Bistro-boss").collection('users');
    const reviewsCollection = client.db("Bistro-boss").collection('reviews');
    const cartCollection = client.db("Bistro-boss").collection('carts');

    // Get And Delete Data

    app.post('/users', async (req, res) => {
      const user = req.body;

      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "Tomar Boca User exist kore Gadha", insertId: null })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    app.get('/menu', async (req, res) => {
      try {
        const result = await menuCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'Failed to fetch menu data' });
      }
    });

    app.get('/reviews', async (req, res) => {
      try {
        const result = await reviewsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'Failed to fetch menu data' });
      }
    });

    app.post('/carts', async (req, res) => {
      try {
        const cartItem = req.body;
        const result = await cartCollection.insertOne(cartItem);
        res.send(result);
      } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).send({ error: 'Failed to add item to cart' });
      }
    });

    app.get('/carts', async (req, res) => {
      try {
        const email = req.query.email;
        const query = { email: email };
        const result = await cartCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'Failed to fetch menu data' });
      }
    });

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })

    // Ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. Connection successful!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Bistro Boss Restaurant Server is Running');
});

app.listen(port, () => {
  console.log(`Bistro Boss Server is running on port: ${port}`);
});
