const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
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

    // Collections
    const menuCollection = client.db("Bistro-boss").collection('menu');
    const usersCollection = client.db("Bistro-boss").collection('users');
    const reviewsCollection = client.db("Bistro-boss").collection('reviews');
    const cartCollection = client.db("Bistro-boss").collection('carts');

    // Jwt Routes
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token });
    })

    // middlewares 
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next();
    }

    // Users Routes
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      console.log(req.headers);

      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Unauthorized Access' })
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });

    })

    app.post('/users', async (req, res) => {
      try {
        const user = req.body;
        const query = { email: user.email };
        const existingUser = await usersCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: "User already exists", insertId: null });
        }
        const result = await usersCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        console.error("Error adding user:", error);
        res.status(500).send({ error: 'Failed to add user' });
      }
    });

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = { $set: { role: 'admin' } };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).send({ error: 'Failed to update user role' });
      }
    });

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await usersCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).send({ error: 'Failed to delete user' });
      }
    });

    // Menu Routes
    app.get('/menu', async (req, res) => {
      try {
        const result = await menuCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching menu:", error);
        res.status(500).send({ error: 'Failed to fetch menu' });
      }
    });

    // Reviews Routes
    app.get('/reviews', async (req, res) => {
      try {
        const result = await reviewsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).send({ error: 'Failed to fetch reviews' });
      }
    });

    // Cart Routes
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
        if (!email) {
          return res.status(400).send({ error: 'Email is required' });
        }
        const query = { email };
        const result = await cartCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching cart items:", error);
        res.status(500).send({ error: 'Failed to fetch cart data' });
      }
    });

    app.delete('/carts/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await cartCollection.deleteOne(query);
        if (result.deletedCount > 0) {
          res.send({ message: "Cart item deleted successfully", deletedId: id });
        } else {
          res.status(404).send({ error: 'Cart item not found' });
        }
      } catch (error) {
        console.error("Error deleting cart item:", error);
        res.status(500).send({ error: 'Failed to delete cart item' });
      }
    });

    // Ping to confirm successful connection
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
//hkkjloj