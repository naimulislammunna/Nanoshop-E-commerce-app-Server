const express = require("express");
const cors = require("cors");
const port = process.env.port || 4000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
app.use(
  cors({
    origin: ["http://localhost:5173"],
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is ok ");
});

app.listen(port, () => {
  console.log("server is runnig on port", port);
});

// jwt integration
app.post("/jwt", (req, res) => {
  const email = req.body;
  const token = jwt.sign(email, process.env.TOKEN_KEY, { expiresIn: "10d" });
  if (email) {
    res.send({ token });
  }
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@express-explore.use1c.mongodb.net/?retryWrites=true&w=majority&appName=express-explore`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const usersCollection = client.db("nano-shop").collection("users");
const productsCollection = client.db("nano-shop").collection("products");

// midleware
const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.send({ massege: "unathorized user" });
  }
  const token = authorization.split(" ")[1];
  console.log("token", token);

  if (!token) {
    return res.send({ massege: "no token" });
  }
  jwt.verify(token, process.env.TOKEN_KEY, (err, decoded) => {
    if (err) {
      return res.send({ massege: "unathorized token" });
    }
    req.decoded = decoded;
    next();
  });
};

const verifySeller = async (req, res, next) => {
  const email = req.decoded.email;

  const query = { email: email };
  const response = await usersCollection.findOne(query);

  if (response?.role !== "seller") {
    return res.send({ massege: "user is not seller" });
  }
  next();
};

const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;

  const query = { email: email };
  const response = await usersCollection.findOne(query);

  if (response?.role !== "admin") {
    return res.send({ massege: "user is not Admin" });
  }
  next();
};

async function run() {
  try {
    app.post("/users", (req, res) => {
      const body = req.body;
      const result = usersCollection.insertOne(body);
      res.send(result);
    });

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.patch("/users-role/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;

      let query = {};
      if (id) {
        query = { _id: new ObjectId(id) };
      }

      const updateDoc = {
        $set: {
          role: "seller",
        },
      };

      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;

      let query = {};
      if (id) {
        query = { _id: new ObjectId(id) };
      }

      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/user", async (req, res) => {
      const email = req.query.email;

      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.get("/all-products", async (req, res) => {
      const search = req.query.search;
      const sort = req.query.sort;
      const brand = req.query.brand;
      const category = req.query.category;

      let query = {};
      if (search) {
        query.title = { $regex: search, $options: "i" };
      }

      if (brand) {
        query.brand = { $regex: brand, $options: "i" };
      }
      if (category) {
        query.category = { $regex: category, $options: "i" };
      }

      const option = { projection: { brand: 1, category: 1 } };
      const productInfo = await productsCollection.find({}, option).toArray();

      const brandList = [...new Set(productInfo.map((p) => p.brand))];
      const categoryList = [...new Set(productInfo.map((p) => p.category))];

      const sortOption = sort === "Assending" ? 1 : -1;

      const result = await productsCollection
        .find(query)
        .sort({ price: sortOption })
        .toArray();
      res.send({ result, brandList, categoryList });
    });

    //get products by id
    app.get("/all-products/:id", async (req, res) => {
      const id = req.params.id;
      let query = {};
      if (id) {
        query = { _id: new ObjectId(id) };
      }

      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    // product add to db
    app.post("/add-product", verifyToken, verifySeller, async (req, res) => {
      const body = req.body;

      const result = await productsCollection.insertOne(body);
      res.send(result);
    });

    app.get("/my-products", verifyToken, verifySeller, async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { sellerEmail: email };
      }

      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete(
      "/my-products/:id",
      verifyToken,
      verifySeller,
      async (req, res) => {
        const id = req.params.id;
        let query = {};
        if (id) {
          query = { _id: new ObjectId(id) };
        }

        const result = await productsCollection.deleteOne(query);
        res.send(result);
      }
    );

    app.put(
      "/update-product/:id",
      verifyToken,
      verifySeller,
      async (req, res) => {
        const id = req.params.id;
        const body = req.body;
        let query = {};
        if (id) {
          query = { _id: new ObjectId(id) };
        }
        const updateDoc = {
          $set: body,
        };

        const result = await productsCollection.updateOne(query, updateDoc);
        res.send(result);
      }
    );

    app.patch("/update-wishlist", verifyToken, async (req, res) => {
      const { userEmail, productId } = req.body;
      let query = {};
      if (userEmail) {
        query = { email: userEmail };
      }
      const updateDoc = {
        $addToSet: { wishlist: new ObjectId(String(productId)) },
      };

      const result = await usersCollection.updateOne(query, updateDoc, {
        upsert: true,
      });
      res.send(result);
    });

    app.get("/my-wishlist/:userId", verifyToken, async (req, res) => {
      const id = req.params.userId;

      const user = await usersCollection.findOne({
        _id: new ObjectId(String(id)),
      });

      if (!user) {
        return res.send({ message: "user not found" });
      }

      const wishlist = await productsCollection
        .find({ _id: { $in: user.wishlist || [] } })
        .toArray();

      res.send(wishlist);
    });

    app.patch("/update-cart", verifyToken, async (req, res) => {
      const { userEmail, productId } = req.body;
      let query = {};
      if (userEmail) {
        query = { email: userEmail };
      }
      const updateDoc = {
        $addToSet: { myCart: new ObjectId(String(productId)) },
      };

      const result = await usersCollection.updateOne(query, updateDoc, {
        upsert: true,
      });
      res.send(result);
    });

    app.get("/my-cart/:userId", verifyToken, async (req, res) => {
      const id = req.params.userId;

      const user = await usersCollection.findOne({
        _id: new ObjectId(String(id)),
      });

      if (!user) {
        return res.send({ message: "user not found" });
      }

      const myCart = await productsCollection
        .find({ _id: { $in: user.myCart || [] } })
        .toArray();

      res.send(myCart);
    });
  } finally {
  }
}
run().catch(console.dir);
