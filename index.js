const express = require('express');
const cors = require('cors');
const port = process.env.port || 4000;

const app = express();
app.use(cors());
app.use(express.json())

app.get('/', (req, res)=>{
    res.send('Server is ok ')
})

app.listen(port, ()=>{
console.log('server is runnig on port', port);

})