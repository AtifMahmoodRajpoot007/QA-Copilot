const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://atifmahmoodrajpoot:Pakistan123@cluster0.cdvrh1z.mongodb.net/?retryWrites=true&w=majority;

async function run() {
    const client = new MongoClient(uri);
    try {
        console.log("Attempting to connect...");
        await client.connect();
        console.log("Connected successfully to server");
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment.");
    } catch (err) {
        console.error("Connection Error:", err);
    } finally {
        await client.close();
    }
}

run().catch(console.dir);
