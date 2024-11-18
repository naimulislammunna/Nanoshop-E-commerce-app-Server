const express = require("express");
const cors = require("cors");
const port = process.env.port || 4000;
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is ok ");
});

app.listen(port, () => {
  console.log("server is runnig on port", port);
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

async function run() {
  try {
    const usersCollection = client.db("nano-shop").collection("users");
    const productsCollection = client.db("nano-shop").collection("products");

    app.post("/users", (req, res) => {
      const body = req.body;
      const result = usersCollection.insertOne(body);
      res.send(result);
    });

    app.get("/users", () => {
      const result = usersCollection.find().toArray();
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
        query.title = {$regex: search, $options: 'i'}
        // query = { title: { $regex: search } };
      }

      if(brand){
        query.brand = {$regex: brand, $options: 'i'}
      }
      if(category){
        query.category = {$regex: category, $options: 'i'}
      }

      const option = {projection: {brand: 1, category: 1}}
      const productInfo = await productsCollection.find({}, option).toArray();

      const brandList = [...new Set(productInfo.map(p => p.brand))];
      const categoryList = [...new Set(productInfo.map(p => p.category))];

    //   const sort = '';
      const sortOption = sort === 'Assending' ? 1 : -1;

      const result = await productsCollection.find(query).sort({price: sortOption}).toArray();
      res.send({result, brandList, categoryList});
    });
  } finally {
  }
}
run().catch(console.dir);
