const express = require("express");
const bodyParser = require("body-parser");
const WebSocket = require("ws");
const http = require("http");
const app = express();
var cors = require("cors");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text());
app.use(cors());
const server = http.createServer(app);

const {
  fetchAllStocks,
  createUser,
  userLogin,
  getAllStocksUsersdata,
  buyStock,
  sellStock,
  makeUserOffline,
  getSellQuantity,
  resetDatabase,
} = require("./db");

const wss = new WebSocket.Server({
  server,
  path: "/GetStocksUsersPersonalData",
});

wss.on("connection", function connection(ws) {
  const AllStocksUsersdata = getAllStocksUsersdata();
  ws.on("message", function incoming(message) {
    console.log("received: %s", message);
  });
  ws.send(JSON.stringify(AllStocksUsersdata));
});

app.get("/", (req, res) => {
  res.send("Server running");
  res.end();
});

app.get("/allStocks", cors(), (req, res) => {
  res.send(fetchAllStocks());
});

app.post("/post/createUser", (req, res) => {
  const { name, password, email } = req.body;
  if (name && password && email) {
    createUser(name, password, email);
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(getAllStocksUsersdata()));
      }
    });
    res.send(JSON.stringify({ user: "Successfully done." }));
  }
});
app.post("/api/signIn", (req, res) => {
  const { password, email } = req.body;

  if (email && password) {
    const getUser = userLogin( email, password );
    if (getUser) {
      wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(getAllStocksUsersdata()));
        }
      });
      res.send(JSON.stringify(getUser));
    } else {
      res.send(JSON.stringify({ user: "invalid user" }));
    }
  }
});

app.post("/api/buyStock", (req, res) => {
  const { email, password, stockId, buyQuantity } = req.body;

  buyStock(email, password, stockId, buyQuantity);
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(getAllStocksUsersdata()));
    }
  });

  const getUserWalletAndHistory = userLogin( email, password );
  const {
    wallet,
    buyStocks,
    sellStocks,
    repository,
    totalCP,
    totalSP,
  } = getUserWalletAndHistory;


  res.send(
    JSON.stringify({
      wallet,
      buyStocks,
      sellStocks,
      repository,
      totalCP,
      totalSP,
    })
  );
});
app.post("/api/sellStock", (req, res) => {
  const { email, password, stockId, sellQuantity } = req.body;

  sellStock(email, password, stockId, sellQuantity);

  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(getAllStocksUsersdata()));
    }
  });

  const getUserWalletAndHistory = userLogin(email, password );

  const {
    wallet,
    buyStocks,
    sellStocks,
    repository,
    totalCP,
    totalSP,
  } = getUserWalletAndHistory;
  res.send(
    JSON.stringify({
      wallet,
      buyStocks,
      sellStocks,
      repository,
      totalCP,
      totalSP,
    })
  );
});

app.post("/api/makeOffine", (req, res) => {
  const receievedData = JSON.parse(req.body);
  const { email, password } = receievedData;

  makeUserOffline(email, password);
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(getAllStocksUsersdata()));
    }
  });
  res.send("make Offline");
});

app.post("/api/signOut", (req, res) => {
  const { password, email } = req.body;

  makeUserOffline(email, password);
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(getAllStocksUsersdata()));
    }
  });
  res.send("make offline");
});
app.post("/api/getSellQuantity", (req, res) => {
  const { email, password, symbol } = req.body;

  const quantity = getSellQuantity(email, password, symbol);
  res.send(JSON.stringify(quantity));
});
app.get("/api/resetAll", (req, res) => {
  resetDatabase();
  res.send("Data set");
});

server.listen(process.env.PORT || 4000, () => {
  console.log(`Server started on port ${4000} :)`);
});
