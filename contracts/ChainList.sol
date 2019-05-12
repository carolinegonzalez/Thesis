pragma solidity ^0.4.18;

// Base contract that is inheritied (Object Oriented view)
import "./Ownable.sol"; //Relative part in the same directory

// NB: Contrary to Java, Solidity supports multiple inheritance
contract ChainList is Ownable {
  // ********************Global variables definition********************
  uint[2] public stock; // Stock levels for seller
  uint[2] public msl; // Minimum stock levels for seller
  uint[2] public prod; // Number of products at production stage for seller
  uint public balance; // Current smart contract balance
  uint public listID; // Number of the list element
  address public seller; // Seller address
  uint public global_client_counter; // Total number of clients (for all products)
  uint[2] public clients_nb; // Number of clients for each of the 2 products sold
  address[][2] public clients_add; // Client addresses for each product

  // ********************Custom types definition********************
  struct Client {
    address organisation; //0
    uint stock; //1
    uint accepted; //2
    uint delivered; //3
    uint rem_price; //4
    uint ordered; //5
    uint agreed_price; //6
    uint product; //7
    uint deposit_amount; //8
    uint deposit_date; //9
  }

  // ********************Mapping definition********************
  // Mapping linking a client address to a Client as defined above
  mapping (address => Client) public clients;

  // ********************Events********************
  // Event generated when a product is checked in or out
  event LogProductInOut(
    address organisation,
    string name,
    uint product,
    uint256 date,
    uint stock,
    string status, // in or out
    uint listID,
    address client
  );

  // Event generated when a logistics partner ackowledges reception of the product
  event LogNewLocation(
    address organisation,
    uint product,
    string name,
    uint256 date,
    address client,
    uint listID
  );

  event LogChangePrice(
    uint quantity,
    uint price,
    address organisation
  );

  // ********************Functions********************
  // Constructor function
  function ChainList() public {
    seller = msg.sender;
    msl = [1, 1]; // Arbitrary defined MSL for the seller
  }

  // deactivate the contract
  function kill() public onlyOwner {
    selfdestruct(owner);
  }

  function refund(address client_add, uint amount_to_refund) payable public {
    require(clients[client_add].product != 0);
    Client storage client_org = clients[client_add];
    //block.timestamp - client_org.deposit_date /60/60 > 2
    require(client_org.deposit_date != 0 && (block.timestamp - client_org.deposit_date) / 60 > 2 && client_org.accepted != 0);
    if(client_org.deposit_amount - (client_org.delivered * client_org.agreed_price) > 0) {
      client_add.transfer(amount_to_refund);
      client_org.accepted = 0;
      client_org.deposit_amount -= amount_to_refund;
    }
  }
  // Pas mieux d'imposer une seule commande acceptée à la fois ?

  // Add client function
  // Allows to add a client to client's product list
  function addClient(uint product, address client_add) public onlyOwner {
    bool new_client = true;
    if(clients[client_add].product != 0)
      new_client = false;
    require(new_client == true);
    clients_nb[product - 1]++;
    global_client_counter++;
    clients_add[product - 1].push(client_add);
    clients[client_add] = Client(
      client_add, //organisation
      0, //stock
      0, //accepted
      0, //delivered
      0, //rem_price
      0, //ordered
      0, // agreed_price
      product, //product
      0, //deposit_amount
      0 //deposit_date
    );
  }

  // Deposit function
  // Allows money to be temporarily stored in the contract
  function deposit(address organisation) payable public {
    require(clients[organisation].product != 0);
    Client storage client_org = clients[organisation];
    client_org.deposit_date = block.timestamp;
    client_org.deposit_amount += msg.value;
    client_org.rem_price -= msg.value;
    balance += msg.value;
  }

  // Withdrawal function
  // Allows the supplier to receive the money corresponding to the sale when
  // product is checked in by the client
  function withdraw(uint256 price_to_pay, address organisation) payable public {
    require(clients[organisation].product != 0);
    Client storage client_org = clients[organisation];
    require(client_org.deposit_amount >= price_to_pay);
    seller.transfer(price_to_pay);
    client_org.deposit_amount -= price_to_pay;
  }

  // Add logistic step function
  // Allows identified logistics partners to acknowledge reception of the products
  function addStep(address organisation, string name, uint product, address client_add) public {
    listID++;
    LogNewLocation(organisation, product, name, block.timestamp, client_add, listID);
  }

  // Check-in and check-out function
  // Allows both the seller and the supplier to check a product in / out
  function newInOut(address organisation, string name, uint product, string status, address client_add) public {
    /**************
        CHECK IN
    ***************/
    if(keccak256(status) == keccak256("in")) {
      if(organisation == seller) {
        require(prod[product - 1] > 0);
        stock[product - 1]++;
        prod[product - 1]--;
      }
      else {
        require(clients[organisation].product != 0);
        Client storage client_org = clients[organisation];
        require(client_org.delivered > 0);
        // A produc that was "on delivery" enters the stock
        client_org.stock++;
        client_org.delivered--;
      }
    /**************
       CHECK OUT
    ***************/
    } else if(keccak256(status) == keccak256("out")) {
      // A product from the seller's stock enters the client's stock
      if(organisation == seller) {
        require(stock[product - 1] > 0 && client_add != seller);
        Client storage client_org2 = clients[client_add];
        require(client_org2.accepted > 0 && client_org2.deposit_amount >= client_org2.agreed_price);
        stock[product - 1]--;
        client_org2.delivered++;
        client_org2.accepted--;
      }
      else {
        require(clients[organisation].product != 0 && clients[organisation].stock > 0);
        clients[organisation].stock--;
      }
    }

    if(organisation == seller) {
      listID++;
      LogProductInOut(organisation, name, product, block.timestamp, stock[product - 1], status, listID, client_add);
    } else {
      listID++;
      LogProductInOut(organisation, name, product, block.timestamp, clients[organisation].stock, status, listID, client_add);
    }
  }

  // Automatic Check-In function
  // Allows to automatically check a product in when QR code is scanned by the client
  function autoNewIn(string name, address organisation, uint product) public {
    require(clients[organisation].product != 0);
    // A product that was "on delivery" enters the stock
    Client storage client_org = clients[organisation];
    client_org.stock++;
    client_org.delivered--;
    listID++;
    LogProductInOut(organisation, name, product, block.timestamp, client_org.stock, "in", listID, organisation);
  }

  // Automatic production ordering Function
  // Allows to place an automatic production order for the supplier when the stock
  // goes below the minimum accepted stock level
  function autoProduction(uint product) public onlyOwner {
    uint fictive_stock = stock[product - 1] + prod[product - 1];
    if(msl[product - 1] - fictive_stock > 0) {
      uint quantity = msl[product - 1] - fictive_stock;
      prod[product - 1] += quantity;
    }
  }

  // Classical ordering Function
  // Allows a client to place an order to the seller
  function placeOrder(address organisation, uint quantity, uint agreed_price) public {
    require(clients[organisation].product != 0);
      Client storage client_org = clients[organisation];
      if(agreed_price != client_org.agreed_price && client_org.agreed_price != 0) {
        require((client_org.accepted + client_org.delivered) == 0);
        LogChangePrice(client_org.ordered + quantity, agreed_price, organisation);
        client_org.ordered += quantity;
        client_org.rem_price += agreed_price;
        client_org.agreed_price = agreed_price;
      } else {
      client_org.ordered += quantity;
      client_org.rem_price += agreed_price;
      client_org.agreed_price = agreed_price;
    }
  }

  // Classical production ordering function
  // Allows the supplier to place a manual production order when needed
  function releaseOrder(uint product) public onlyOwner {
    prod[product - 1]++;
  }

  // Order accepting Function
  // Allows the supplier to accept the order passed by the seller
  function acceptOrder(address client_add) public onlyOwner {
    Client storage client_org = clients[client_add];
    require(client_org.accepted == 0);
    uint temp = client_org.ordered;
    require(temp > 0);
    client_org.ordered = 0;
    client_org.accepted += temp;
  }
}
