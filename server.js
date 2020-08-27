const express = require("express");
const bodyParser = require("body-parser");
const WebSocket = require("ws");
const http = require("http");
const app = express();
var cors = require("cors");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text());
app.use(cors())
const server = http.createServer(app);
var locks = require("locks");
var mutex = locks.createMutex();

const {
  fetchAllStocks,
  createUser,
  userLogin,
  getAllStocksUsersdata,
  buyStock,
  sellStock,
  makeUserOffline,
  getSellQuantity,
} = require("./db");

const wss = new WebSocket.Server({
  server,
  path: "/GetStocksUsersPersonalData",
});

wss.on("connection", function connection(ws) {
  mutex.lock(function () {
    const AllStocksUsersdata = getAllStocksUsersdata();
    ws.on("message", function incoming(message) {
      console.log("received: %s", message);
    });
    ws.send(JSON.stringify(AllStocksUsersdata));

    mutex.unlock();
  });
});

app.get("/", (req, res) => {
  mutex.lock(function () {
    res.send("Server running");
    res.end();

    mutex.unlock();
  });
});


app.get("/allStocks", cors(), (req, res) => {
  mutex.lock(function () {
    res.send(fetchAllStocks());
    mutex.unlock();
  });
});

app.post("/post/createUser", (req, res) => {
  mutex.lock(function () {
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

    mutex.unlock();
  });
});
app.post("/api/signIn", (req, res) => {
  const { password, email } = req.body;
  mutex.lock(function () {
    if (email && password) {
      const getUser = userLogin({ email, password });
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

    mutex.unlock();
  });
});

app.post("/api/buyStock", (req, res) => {
  const { email, password, stockId, buyQuantity } = req.body;
  mutex.lock(function () {
    buyStock(email, password, stockId, buyQuantity);
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(getAllStocksUsersdata()));
      }
    });

    const getUserWalletAndHistory = userLogin({ email, password });
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

    mutex.unlock();
  });
});
app.post("/api/sellStock", (req, res) => {
  const { email, password, stockId, sellQuantity } = req.body;

  mutex.lock(function () {
    sellStock(email, password, stockId, sellQuantity);

    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(getAllStocksUsersdata()));
      }
    });

    const getUserWalletAndHistory = userLogin({ email, password });

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

    mutex.unlock();
  });
});

app.post("/api/makeOffine", (req, res) => {
  const receievedData = JSON.parse(req.body);
  const { email, password } = receievedData;

  mutex.lock(function () {
    makeUserOffline(email, password);
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(getAllStocksUsersdata()));
      }
    });
    res.send("make Offline");

    mutex.unlock();
  });
});

app.post("/api/signOut", (req, res) => {
  const { password, email } = req.body;
  mutex.lock(function () {

    makeUserOffline(email, password);
      wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(getAllStocksUsersdata()));
    }
   });
  res.send("make offline");

  mutex.unlock();
})
});
app.post("/api/getSellQuantity", (req, res) => {
  const { email, password, symbol } = req.body;
  mutex.lock(function () {
  const quantity = getSellQuantity(email, password, symbol);
  res.send(JSON.stringify(quantity));

  mutex.unlock()
})
});

server.listen(process.env.PORT || 4000, () => {
  console.log(`Server started on port ${4000} :)`);
});
