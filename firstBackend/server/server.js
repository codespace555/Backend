import express from "express";
import 'dotenv/config'
const app = express();


app.get("/jokes", (req, res) => {
  const jokes = [
    {
      id: 1,
      title: "A joke",
      content: "This is a j",
    },
    {
      id: 2,
      title: "Another joke",
      content: "This is another joke",
    },
    {
      id: 3,
      title: "A third joke",
      content: "This is a third joke",
    },
    {
      id: 4,
      title: "A fourth joke",
      content: "This is a fourth joke",
    },
    {
      id: 5,
      title: "A fifth joke",
      content: "This is a fifth joke",
    },
  ];
  res.send(jokes);
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`server is start http://localhost:${PORT}`);
});
