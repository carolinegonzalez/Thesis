pragma solidity ^0.4.18;

// Base contract that is inheritied (Object Oriented view)
import "./Ownable.sol"; //Relative part in the same directory

// NB: Contrary to Java, Solidity supports multiple inheritance
contract ChainList is Ownable {
  // ********************Global variables definition********************
  uint[2] public stock1; // Stock levels for seller
  uint[2] public MSL1; // Minimum stock levels for seller
  uint[2] public ProdA; // Number of products at production stage for seller
  uint public balance; // Current smart contract balance
  address public seller; // Seller address
  uint public globalCounter;  // Number of InOutProducts
  uint public globalClientCounter; // Total number of clients (for all products)
  uint[2] public clientsNb; // Number of clients for each of the 3 products sold
  uint[][2] public stockClient1; // Stock levels for each client
  uint[][2] public Acc1; // Number of accepted products for each client
  uint[][2] public Del1; // Number of delivered products for each client
  uint[][2] public Pay1; // Number of paid products for each client
  uint[][2] public Price1; // Remaining prices to be paid for each client
  uint[][2] public Ord1; // Number of ordered products for each client
  uint[][2] public prices1; // Agreed price for each client

  // ********************Custom types definition********************
  struct client {
    uint id; //0
    address organisation; //1
    uint stock; //2
    uint accepted; //3
    uint delivered; //4
    uint paid; //5
    uint remPrice; //6
    uint ordered; //7
    uint agreedPrice; //8
    uint product; //9
    uint productCounter; //10
  }

  // Structure defining a product being checked in or out
  struct inOutProduct {
    uint id; //0
    string name; //1
    address organisation; //2
    uint product; //3
    uint date; //4
    uint stock1; //5
    string status; //6 (in or out)
  }

  // ********************Mapping definition********************
  // Mapping linking a client id to a Client as defined above
  mapping (uint => client) public clients;
  // Mapping linking a product id to an InOutProduct as defined above
  mapping (uint => inOutProduct) public products;

  // ********************Events********************
  // Event generated when a product is checked in or out
  event logProductInOut(
    uint _globalCounter,
    address _organisation,
    string _name,
    uint _product,
    uint256 _date,
    uint _stock,
    string _status // in or out
  );

  // Event generated when a new client is added
  event logClientIn(
    uint _clientCounter,
    address _organisation
  );

  // ********************Functions********************
  // Constructor function
  function ChainList() public {
    seller = msg.sender;
    MSL1 = [1, 1]; // Arbitrary defined MSL for the seller
  }

  // deactivate the contract
  function kill() public onlyOwner {
    selfdestruct(owner);
  }

  // Add client function
  // Allows to add a client to client's product list
  function addClient(uint _product, address _client) public {
    clientsNb[_product-1]++;
    globalClientCounter++;
    stockClient1[_product-1].push(0);
    Acc1[_product-1].push(0);
    Del1[_product-1].push(0);
    Pay1[_product-1].push(0);
    Price1[_product-1].push(0);
    Ord1[_product-1].push(0);
    prices1[_product-1].push(0);
    uint clientCounter = clientsNb[_product-1];
    clients[globalClientCounter] = client(
      globalClientCounter,
      _client,
      stockClient1[_product-1][clientCounter-1],
      Acc1[_product-1][clientCounter-1],
      Del1[_product-1][clientCounter-1],
      Pay1[_product-1][clientCounter-1],
      Price1[_product-1][clientCounter-1],
      Ord1[_product-1][clientCounter-1],
      prices1[_product-1][clientCounter-1],
      _product,
      clientCounter
    );
    logClientIn(clientCounter, _client);
  }

  // Get client counter function
  // Allows to retrieve client index for a specific product rather than global index
  function getCounter(address _organisation, uint _product) public view returns(uint) {
    if(_organisation != seller) {
      uint i = 1;
      address clientOrganisation = clients[i].organisation;
      uint prodCategory = clients[i].product;
      while(clientOrganisation != _organisation || prodCategory != _product) {
        i = i+1;
        clientOrganisation = clients[i].organisation;
        prodCategory = clients[i].product;
      }
      return clients[i].productCounter;
    }
    else {
      return 0;
    }
  }

  // Deposit function
  // Allows money to be temporarily stored in the contract
  function deposit(address _organisation, uint _product) payable public {
    uint clientCounter = getCounter(_organisation, _product);
    uint stillToPay = Acc1[_product-1][clientCounter - 1] - Pay1[_product-1][clientCounter - 1];
    Pay1[_product-1][clientCounter - 1] += stillToPay;
    Price1[_product-1][clientCounter - 1] -= msg.value;
    balance += msg.value;
  }

  // Accepting function
  // Allows the supplier to receive the money corresponding to the sale when
  // product is checked in by the client
  function accept(uint256 _price) payable public {
    seller.transfer(_price);
  }

  // Check-in and check-out function
  // Allows both the seller and the supplier to check a product in / out
  function newInOut(address _organisation, string _name, uint _product, string _status, address _client) public {
    globalCounter++;
    uint orgCounter = getCounter(_organisation, _product);
    /**************
        CHECK IN
    ***************/
    if(keccak256(_status) == keccak256("in")) {
      if(_organisation == seller) {
        require(ProdA[_product-1] > 0);
        stock1[_product-1]++;
        ProdA[_product-1]--;
      }
      else {
        require(Del1[_product-1][orgCounter - 1] > 0);
        // A produc that was "on delivery" enters the stock
        stockClient1[_product-1][orgCounter - 1]++;
        Del1[_product-1][orgCounter - 1]--;

      }
    /**************
       CHECK OUT
    ***************/
    } else if(keccak256(_status) == keccak256("out")) {
      // A product from the seller's stock enters the client's stock
      if(_organisation == seller) {
        require(_client != seller);
        stock1[_product-1]--;
        uint clientCounter = getCounter(_client, _product);
        Del1[_product-1][clientCounter - 1]++;
        Acc1[_product-1][clientCounter - 1]--;
        Pay1[_product-1][clientCounter - 1]--;
      }
      else {
        stockClient1[_product-1][orgCounter - 1]--;
      }
    }

    // Create a new product in or out
    products[globalCounter] = inOutProduct(
      globalCounter,
      _name,
      _organisation,
      _product,
      block.timestamp,
      stock1[(_product-1)],
      _status
    );

    if(_organisation == seller) {
      logProductInOut(globalCounter, _organisation, _name, _product, block.timestamp, stock1[(_product-1)], _status);
    } else {
      logProductInOut(globalCounter, _organisation, _name, _product, block.timestamp, stockClient1[_product-1][orgCounter - 1], _status);
    }
  }

  // Automatic Check-In function
  // Allows to automatically check a product in when QR code is scanned by the client
  function autoNewIn(string _name, address _organisation, uint _product) public {
    globalCounter++;
    uint orgCounter = getCounter(_organisation, _product);
      // A produc that was "on delivery" enters the stock
      stockClient1[_product-1][orgCounter-1]++;
      Del1[_product-1][orgCounter-1]--;

    // Create a new product in or out
    products[globalCounter] = inOutProduct(
      globalCounter,
      _name,
      _organisation,
      _product,
      block.timestamp,
      stock1[(_product-1)],
      "in"
    );
    logProductInOut(globalCounter, _organisation, _name, _product, block.timestamp, stockClient1[_product-1][orgCounter-1], "in");
  }

  // Automatic production ordering Function
  // Allows to place an automatic production order for the supplier when the stock
  // goes below the minimum accepted stock level
  function automaticProduction(uint _product) public {
    uint fictiveStock = stock1[_product-1] + ProdA[_product-1];
    if(MSL1[_product-1] - fictiveStock > 0) {
      uint _quantity = MSL1[_product-1] - fictiveStock;
      ProdA[_product-1] += _quantity;
    }
  }

  // Classical ordering Function
  // Allows a client to place an order to the seller
  function placeOrder(address _organisation, uint _product, uint _quantity, uint _price) public {
    uint clientCounter = getCounter(_organisation, _product);
    Ord1[_product-1][clientCounter-1] += _quantity;
    Price1[_product-1][clientCounter-1] += _price;
    prices1[_product-1][clientCounter-1] = _price;
  }

  // Classical production ordering function
  // Allows the supplier to place a manuel production order when needed
  function releaseOrder(uint _product) public {
    ProdA[_product-1]++;
  }

  // Order accepting Function
  // Allows the supplier to accept the order passed by the seller
  function acceptOrder(uint _product, address _client) public {
    uint clientCounter = getCounter(_client, _product);
    uint temp = Ord1[_product - 1][clientCounter - 1];
    Ord1[_product-1][clientCounter - 1] = 0;
    Acc1[_product-1][clientCounter - 1] += temp;
  }

  // Last change getting function
  // Allows the user to get the InOutProduct structure generated
  // NB: This function will be used in parallel with the mapping described before
  function getLast() public view returns (uint) {
    if(globalCounter > 0) {
      return globalCounter;
    } else {
      return 0;
    }
  }
}
