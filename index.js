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

// jwt inteartion
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
  console.log(authorization);
  if (!authorization) {
    return res.send({ massege: "unathorized user" });
  }
  const token = authorization.split(" ")[1];
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
  console.log("email", email);

  const query = { email: email };
  const response = await usersCollection.findOne(query);
  console.log(response);

  if (response?.role !== "seller") {
    return res.send({ massege: "user is not seller" });
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

    // app.get("/users", () => {
    //   const result = usersCollection.find().toArray();
    //   res.send(result);
    // });

    app.get("/user", async (req, res) => {
      const email = req.query.email;
      // console.log(email);

      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.get("/all-products", async (req, res) => {
      const search = req.query.search;
      const sort = req.query.sort;
      const brand = req.query.brand;
      const category = req.query.category;
      // console.log(search, sort, brand, category);

      let query = {};
      if (search) {
        query.title = { $regex: search, $options: "i" };
        // query = { title: { $regex: search } };
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

      //   const sort = '';
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
    app.post("/add-product", verifyToken, verifySeller, async(req, res) => {
        const body = req.body;

        const result = await productsCollection.insertOne(body)
        res.send(result);
    });

    app.get("/my-products", async (req, res) => {
        const email = req.query.email;
        let query = {};
        if (email) {
          query = { sellerEmail: email };
        }
  
        const result = await productsCollection.find(query).toArray();
        res.send(result);
      });



  } finally {
  }
}
run().catch(console.dir);
