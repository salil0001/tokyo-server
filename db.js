const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("db.json");
const db = low(adapter);
// Set some defaults (required if your JSON file is empty)
db.defaults({
  users: [],
  stocks: [],
}).write();

function fetchAllStocks() {
  return db.get("stocks").value();
}
function financialRoundNumber(x) {
  return Number.parseFloat(x).toFixed(2);
}

function createUser(name, password, email) {
  const id = Math.random();
  const wallet = 6500;
  const displayPicture =
    "https://img.icons8.com/plasticine/100/000000/person-male.png";
  db.get("users")
    .push({
      name,
      password,
      email,
      id,
      displayPicture,
      wallet,
      isOnline: true,
      totalCP: 0,
      totalSP: 0,
      buyStocks: [],
      sellStocks: [],
      repository: [],
    })
    .write();
}
function userLogin(getEmail, password ) {
  const getUser = db.get("users").find({ email:getEmail, password }).value();
  if (getUser) {
    db.get("users")
      .find({ email:getEmail, password })
      .assign({ isOnline: true })
      .write();

    const {
      name,
      id,
      displayPicture,
      wallet,
      isOnline,
      buyStocks,
      sellStocks,
      repository,
      totalCP,
      totalSP,
      email
    } = getUser;

    return {
      name,
      id,
      displayPicture,
      wallet,
      isOnline,
      buyStocks,
      sellStocks,
      totalCP,
      totalSP,
      email,
      repository
    };
  }
  return "";
}
function getAllStocksUsersdata() {
  const getAllUsers = db.get("users").value();
  const filterPasswordUsers = getAllUsers.map((user) => {
    const {
      name,
      email,
      id,
      displayPicture,
      isOnline,
      totalCP,
      totalSP,
    } = user;
    return {
      name,
      email,
      id,
      displayPicture,
      isOnline,
      totalCP,
      totalSP,
    };
  });

  const getAllStocks = db.get("stocks").value();
  const filterAllStocks = getAllStocks.map((stock) => {
    const {
      id,
      name,
      currentPrice,
      weekHigh52,
      weekLow52,
      yearIPO,
      imageCDN,
      currency,
      symbol,
      todayPrice,
    } = stock;
    return {
      id,
      name,
      currentPrice,
      weekHigh52,
      weekLow52,
      yearIPO,
      imageCDN,
      currency,
      symbol,
      todayPrice,
    };
  });

  return {
    users: filterPasswordUsers,
    stocks: filterAllStocks,
  };
}
function week52LowHigh(newPrice, weekHigh52, weekLow52, stockId) {
  if (newPrice > weekHigh52) {
    db.get("stocks")
      .find({ id: stockId })
      .assign({ weekHigh52: parseFloat(newPrice) })
      .write();
  } else if (newPrice < weekLow52) {
    db.get("stocks")
      .find({ id: stockId })
      .assign({ weekLow52: parseFloat(newPrice) })
      .write();
  }
}

function buyStock(email, password, stockId, buyQuantity) {

  const checkLoginCredentials = userLogin( email, password );
  if (checkLoginCredentials) {
    const findStock = db.get("stocks").find({ id: stockId }).value();
    const { totalQuantityAvailable, symbol, weekHigh52, weekLow52,name } = findStock;

    const newQuantity =
      parseInt(totalQuantityAvailable) - parseInt(buyQuantity);
    if (newQuantity >= 0) {
      const { currentPrice } = findStock;
      const newPrice = financialRoundNumber(
        currentPrice * Math.pow(1.005, buyQuantity)
      );
      week52LowHigh(newPrice, weekHigh52, weekLow52, stockId);

      const { wallet, buyStocks, repository } = checkLoginCredentials;
      const newWalletAmount = financialRoundNumber(
        parseFloat(wallet) - parseFloat(buyQuantity) * newPrice
      );
      if (newWalletAmount <= 0) {
        return {
          result: "Insufficient wallent amount.",
        };
      }
      //adding repository

      const totalStockQuantityAvailable = repository.filter(
        (repo) => repo.stockSymbol === symbol
      );
      const findIndexOfStock = repository.findIndex(
        (repo) => repo.stockSymbol === symbol
      );

      if (totalStockQuantityAvailable.length === 0) {
        repository.push({
          stockSymbol: symbol,
          buyQuantity: parseInt(buyQuantity),
          avgCostPrice: parseFloat(parseFloat(newPrice).toFixed(2)),
          stockName:name,
          id:Math.random()
        });
      } else {
        const BuyQuantity = totalStockQuantityAvailable[0].buyQuantity;
        const { stockSymbol, avgCostPrice } = totalStockQuantityAvailable[0];

        const newAvgCostPrice =
          (parseFloat(avgCostPrice) * parseInt(BuyQuantity) +
            parseFloat(newPrice) * parseInt(buyQuantity)) /
          (parseInt(BuyQuantity) + parseInt(buyQuantity));

        const newbuyQuantity = parseInt(BuyQuantity) + parseInt(buyQuantity);
        repository.splice(findIndexOfStock, 1, {
          stockSymbol,
          avgCostPrice: parseFloat(newAvgCostPrice).toFixed(2),
          buyQuantity: parseInt(newbuyQuantity),
          stockName:name,
          id:Math.random()
        });
      }

      ////
      buyStocks.push({
        stockSymbol: symbol,
        buyQuantity: parseFloat(buyQuantity),
        costPrice: parseFloat(newPrice),
        stockName:name,
        id:Math.random()
      });

      /////

      db.get("stocks")
        .find({ id: stockId })
        .assign({
          totalQuantityAvailable: parseFloat(newQuantity),
          currentPrice: parseFloat(newPrice),
        })
        .write();
      db.get("users")
        .find({ email, password })
        .assign({ wallet: parseFloat(newWalletAmount), buyStocks })
        .write();
    } else {
      return {
        result: "Stock Quantity is not available",
      };
    }
  }
  return {
    result: "Invalid user",
  };
}

function sellStock(email, password, stockId, sellQuantity) {
  const checkLoginCredentials = userLogin( email, password );
  if (checkLoginCredentials) {
   
    const findStock = db.get("stocks").find({ id: stockId }).value();

    const { totalQuantityAvailable, symbol,name } = findStock;
    const newQuantity =
      parseInt(totalQuantityAvailable) + parseInt(sellQuantity);

    if (newQuantity >= 0) {
      const { currentPrice, weekHigh52, weekLow52,name } = findStock;
      const newPrice = financialRoundNumber(
        currentPrice / Math.pow(1.005, sellQuantity)
      );

      week52LowHigh(newPrice, weekHigh52, weekLow52, stockId);

      const {
        wallet,
        sellStocks,
        repository,
        totalCP,
        totalSP,
      } = checkLoginCredentials;

      const totalStockQuantityAvailable = repository.filter(
        (repo) => repo.stockSymbol === symbol
      );
      const findIndexOfStock = repository.findIndex(
        (repo) => repo.stockSymbol === symbol
      );

      const { buyQuantity } = totalStockQuantityAvailable[0];
      const { stockSymbol, avgCostPrice,stockName } = totalStockQuantityAvailable[0];
      const newBuyQuantity = parseInt(buyQuantity) - parseInt(sellQuantity);

      if (newBuyQuantity === 0) {
        repository.splice(findIndexOfStock, 1);
      } else {
        repository.splice(findIndexOfStock, 1, {
          stockSymbol,
          stockName,
          avgCostPrice: parseFloat(avgCostPrice),
          buyQuantity: parseInt(newBuyQuantity),
          id:Math.random()
        });
      }

      const newWalletAmount = financialRoundNumber(
        parseFloat(wallet) + parseFloat(sellQuantity) * parseFloat(currentPrice)
      );

      const newtotalCP = (
        parseFloat(totalCP) +
        parseFloat(avgCostPrice) * parseInt(sellQuantity)
      ).toFixed(2);

      const newtotalSP = (
        parseFloat(totalSP) +
        parseFloat(currentPrice) * parseInt(sellQuantity)
      ).toFixed(2);
      sellStocks.push({
        id:Math.random(),
        stockSymbol,
        stockName,
        quantity: parseInt(sellQuantity),
        avgCostPrice: parseFloat(avgCostPrice),
        totalCP: parseFloat(
          (parseFloat(avgCostPrice) * parseInt(sellQuantity)).toFixed(2)
        ),
        avgSellingPrice: parseFloat(currentPrice),
        totalSP: parseFloat(
          (parseFloat(currentPrice) * parseInt(sellQuantity)).toFixed(2)
        ),
      });

      db.get("stocks")
        .find({ id: stockId })
        .assign({
          totalQuantityAvailable: parseFloat(newQuantity),
          currentPrice: parseFloat(newPrice),
        })
        .write();
      db.get("users")
        .find({ email, password })
        .assign({
          wallet: parseFloat(newWalletAmount),
          sellStocks,
          repository,
          totalCP: parseFloat(newtotalCP),
          totalSP: parseFloat(newtotalSP),
        })
        .write();
    } else {
      return {
        result: "Stock Quantity is not available",
      };
    }
  }
  return "";
}

function makeUserOffline(email, password) {
  db.get("users").find({ email, password }).assign({ isOnline: false }).write();
}

function getSellQuantity(email, password, symbol) {
  const getUser = db.get("users").find({ email, password }).value();

  if (getUser) {
    const { repository } = getUser;
   
    const findIndex = repository.findIndex((sym) => sym.stockSymbol === symbol);
    if (findIndex === -1) {
      return 0;
    }
    return repository[findIndex].buyQuantity;
  }
  return "";
}

function resetDatabase() {
  db.set({
    users: [],
  }).write();
  db.set({
    stocks: [
      {
        id: 1,
        name: "Facebook",
        totalQuantityAvailable: 501096,
        currentPrice: 200,
        todayPrice: 200,
        weekHigh52: 212.34,
        weekLow52: 200,
        yearIPO: 1996,
        imageCDN: "https://img.icons8.com/fluent/48/000000/facebook-new.png",
        currency: "USD",
        symbol: "FCB",
      },
      {
        id: 2,
        name: "Nissan",
        totalQuantityAvailable: 1000000,
        currentPrice: 2100,
        todayPrice: 2000,
        weekHigh52: 2300,
        weekLow52: 220,
        yearIPO: 1990,
        imageCDN: "https://img.icons8.com/color/48/000000/nissan.png",
        currency: "USD",
        symbol: "NSN",
      },
      {
        id: 3,
        name: "Tesla",
        totalQuantityAvailable: 1000000,
        currentPrice: 450,
        todayPrice: 500,
        weekHigh52: 700,
        weekLow52: 210,
        yearIPO: 2009,
        imageCDN: "https://img.icons8.com/color/48/000000/tesla-logo.png",
        currency: "USD",
        symbol: "TSN",
      },
      {
        id: 4,
        name: "Reliance",
        totalQuantityAvailable: 1000000,
        currentPrice: 2000,
        todayPrice: 1800,
        weekHigh52: 2300,
        weekLow52: 800,
        yearIPO: 2000,
        imageCDN:
          "https://img.icons8.com/ios/50/000000/reliance-digital-tv.png",
        currency: "USD",
        symbol: "RIL",
      },
      {
        id: 5,
        name: "Mahindra & Mahindra",
        totalQuantityAvailable: 1000000,
        currentPrice: 600,
        todayPrice: 650,
        weekHigh52: 900,
        weekLow52: 275,
        yearIPO: 2010,
        imageCDN: "https://img.icons8.com/nolan/48/maxcdn.png",
        currency: "USD",
        symbol: "M&M",
      },
    ],
  }).write();
}
module.exports = {
  fetchAllStocks,
  createUser,
  userLogin,
  getAllStocksUsersdata,
  buyStock,
  sellStock,
  makeUserOffline,
  getSellQuantity,
  resetDatabase,
};
