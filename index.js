const express = require('express');
const cors = require('cors');
const port = process.env.port || 4000;
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json())

app.get('/', (req, res)=>{
    res.send('Server is ok ')
})

app.listen(port, ()=>{
console.log('server is runnig on port', port);

})



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@express-explore.use1c.mongodb.net/?retryWrites=true&w=majority&appName=express-explore`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const usersCollection = client.db('nano-shop').collection('users');

    app.post('/users', (req, res)=>{
        const body = req.body;
        const result = usersCollection.insertOne(body);
        res.send(result)
    })

  } finally {

  }
}
run().catch(console.dir);
