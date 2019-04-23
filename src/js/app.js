App = {
  web3Provider: null,
  contracts: {},
  loading: false,
  loading2: false,
  existency: false,
  init: function() {
    return App.initWeb3();
  },

  /*
    Description
    This function allows to update the value of an integer cookie

    Argument
    cname ("string"): The name of the Cookie to be updated
    op ("string"): The type of operation to be perfomed (addition or soustraction)
    valUpdate (uint): The value to be added or substracted

    Return
    Nothing
  */
  updateCookie: function(cname, op, valUpdate) {
    var temp = parseInt(App.getCookie(cname));
    App.deleteCookie(cname);
    if(op == "addition")
      App.setCookie(cname, parseInt(temp) + parseInt(valUpdate), 10);
    if(op == "soustraction")
      App.setCookie(cname, parseInt(temp) - parseInt(valUpdate), 10);
  },

  /*
    Description
    This function allows to update the value of a string cookie

    Argument
    cname ("string"): The name of the Cookie to be updated
    newStr ("string"): The new value for the cookie

    Return
    Nothing
  */
  updateStrCookie: function(cname, newStr) {
    App.deleteCookie(cname);
    App.setCookie(cname, newStr, 10);
  },

  /*
    Description
    This function allows the creation of a Cookie, keeping its value despite page refresh
    and account change

    Argument
    cname ("string"): The name of the Cookie to be created
    cvalue (uint): The value given to this Cookie
    exdays (uint): The number of days the Cookie must live

    Return
    Nothing
  */
  setCookie: function(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  },

  /*
    Description
    This function allows the retrieval of a Cookie value

    Argument
    cname ("string"): The name of the Cookie of interest

    Return
    The current value of the Cookie
  */
  getCookie: function(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  },

  /*
    Description
    This function allows the deletion of a Cookie

    Argument
    cname ("string"): The name of the Cookie to be deleted

    Return
    Nothing
  */
  deleteCookie: function(cname) {
    var cookie_date = new Date ( );  // current date & time
    cookie_date.setTime ( cookie_date.getTime() - 1 );
    document.cookie = cname += "=; expires=" + cookie_date.toGMTString();
  },

  /*
    Description
    This function allows to initialize, create and plug the provider directly
    into our local node. It also makes a call to a function displaying account
    information.

    Argument
    Nothing

    Return
    Nothing
  */
  initWeb3: function() {
    //App.deleteCookie('currLen');
    // initialize web3
    if(typeof web3 !== 'undefined') {
      //reuse the provider of the Web3 object injected by Metamask
      App.web3Provider = web3.currentProvider;
    } else {
      //create a new provider and plug it directly into our local node
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);

    App.displayAccountInfo();

    return App.initContract();
  },

  /*
    Description
    This function allows the display of account information (address + balance).

    Argument
    Nothing

    Return
    Nothing
  */
  displayAccountInfo: function() {
    console.log("Cookies values are " + App.getCookie("select1"));
    console.log("Cookies values are " + App.getCookie("select2"));
    console.log("Cookies values are " + App.getCookie("currLen"));
    web3.eth.getCoinbase(function(err, account) {
      if(err === null) {
        App.account = account;
        $('#account').text(account);
        web3.eth.getBalance(App.account, function(err, balance) {
          if(err === null) {
            // Display the balance of the account
            $('#accountBalance').text(web3.fromWei(balance, "ether") + " ETH");
          }
        })
      }
    });
  },

  /*
    Description
    This functions determine the product to be dealt with. It is called when
    buttons "Product 1" or "Product 2" are selected from the user interface.

    Argument
    Nothing

    Return
    Nothing
  */
  select1: function() {
    if(App.getCookie("select1") == "") {
      App.setCookie("select1", 1, 10);
      App.deleteCookie("select2");
    }
  },

  select2: function() {
    if(App.getCookie("select2") == "") {
      App.setCookie("select2", 1, 10);
      App.deleteCookie("select1");
    }
  },

  /*
    Description
    This function allows to instantiate the Truffle contract abstraction and set
    the associated provider. It also calls functions displaying buttons on the
    UI.

    Argument
    Nothing

    Return
    Nothing
  */
  initContract: function() {
    $.getJSON('ChainList.json', function(chainListArtifact) {
      // get the contract artifact file and use it to instantiate a truffle contract abstraction
      App.contracts.ChainList = TruffleContract(chainListArtifact);
      // set the provider for our contracts
      App.contracts.ChainList.setProvider(App.web3Provider);

      if(App.getCookie("select1") != "") {
        App.displayButtons(1);
        App.displayInfo(1);
        App.reloadClientsOrders(1);
        //App.reloadClients(1);
      }
      else if(App.getCookie("select2") != "") {
        App.displayButtons(2);
        App.displayInfo(2);
        App.reloadClientsOrders(2);
        //App.reloadClients(2);
      }

      $('#testLen').hide();
      $('#testDate').hide();
      $('#testOrganisation').hide();
      $('#testProduct').hide();
      $('#testAddress').hide();
      // listen to events
      App.listenToEvents();
    });
  },


  /*
    Description
    This function allows to update orders and clients information

    Argument
    _product (uint): The type of product to be dealt with

    Return
    Nothing
  */
  reloadClientsOrders: function(_product) {
    if(App.loading) {
      return;
    }
    App.loading = true;

    App.displayAccountInfo();

    var chainListInstance;

    App.contracts.ChainList.deployed().then(function(instance) {
      chainListInstance = instance;
      // Get the total number of clients
      return chainListInstance.globalClientCounter();
    }).then(function(clients) {
      var _clients = parseInt(clients.toString());
      // retrieve the order placeholder and clear it
      $('#ordersRow').empty();
      // retrieve the client placeholder and clear it
      $('#clientsRow').empty();
      for(var i = 0; i < _clients; i++) {
        App.retrieveOrderInfo(_product, i);
        App.retrieveClientInfo(_product, i);
      }
      App.loading = false;
    }).catch(function(err) {
      console.error(err.message);
      App.loading = false;
    });
  },


  /*
    Description
    This function allows to retrieve orders information

    Argument
    _product (uint): The type of product to be dealt with
    _clientNb(uint): The global index of the client to be dealt with

    Return
    Nothing
  */
  retrieveOrderInfo: function(_product, _clientNb) {
    App.contracts.ChainList.deployed().then(function(instance) {
      // Retrieve the client structure mapped to the index _clientNb+1
      instance.clients(_clientNb+1).then(function(clientStruct) {
        if(clientStruct[9] == _product) {
          var clientAddress = clientStruct[1];
          var prodCounter = clientStruct[10];
          instance.Price1(_product-1, prodCounter-1).then(function(price) {
            var orderPrice = parseInt(price.toString());
            instance.Ord1(_product-1, prodCounter-1).then(function(ordered) {
              var clientOrdered = parseInt(ordered.toString());
              // If an order has been placed by the client, display it
              if(clientOrdered != 0)
                App.displayOrder(clientAddress, orderPrice, clientOrdered);
          })})
        }
      })
    });
  },

  /*
    Description
    This function allows to retrieve clients information

    Argument
    _product (uint): The type of product to be dealt with
    _clientNb(uint): The global index of the client to be dealt with

    Return
    Nothing
  */
  retrieveClientInfo: function(_product, _clientNb) {
    App.contracts.ChainList.deployed().then(function(instance) {
      // Retrieve the client structure mapped to the index _clientNb+1
        instance.clients(_clientNb+1).then(function(clientStruct) {
          if(clientStruct[9] == _product) {
            var clientId = clientStruct[0];
            var clientAddress = clientStruct[1];
            var prodCounter = clientStruct[10];
            instance.stockClient1(_product-1, prodCounter-1).then(function(stock) {
              var clientStock = parseInt(stock.toString());
              instance.Ord1(_product-1, prodCounter-1).then(function(ordered) {
                var clientOrdered = parseInt(ordered.toString());
                instance.Acc1(_product-1, prodCounter-1).then(function(accepted) {
                  var clientAccepted = parseInt(accepted.toString());
                  instance.Del1(_product-1, prodCounter-1).then(function(delivered) {
                    var clientDelivered = parseInt(delivered.toString());
                    instance.prices1(_product-1, prodCounter-1).then(function(agreedPrice) {
                      var clientPrice = parseInt(agreedPrice.toString());
                      instance.Pay1(_product-1, prodCounter-1).then(function(paid) {
                        var clientPaid = parseInt(paid.toString());
                        instance.seller().then(function(seller) {
                          var _seller = seller.toString();
                          // Display client info to buyer to the seller or to this client
                          if(App.account == _seller || App.account == clientAddress)
                            App.displayClient(clientAddress, clientStock, clientOrdered, clientAccepted, clientDelivered, clientPrice, clientPaid, _seller, _product, prodCounter);
          })})})})})})})
        }
      })
    });
  },

  /*
    Description
    This function allows to display orders information

    Argument
    _address ("string"): The address of the client having placed the order
    _price (uint): The proposed price for the order (/!\ 1 per client)
    _ordered (uint): The amount of products ordred

    Return
    Nothing
  */
  displayOrder: function(_address, _price, _ordered) {
    var ordersRow = $('#ordersRow');

    var orderTemplate = $('#orderRequestTemplate');
    // Complete text areas with retrieved information
    orderTemplate.find('.order-client').text(_address);
    orderTemplate.find('.order-quantity').text(_ordered);
    orderTemplate.find('.order-price').text(_price);
    // Attach attributes to the "Accept" button
    orderTemplate.find('.btn-buy').attr('client', _address);
    orderTemplate.find('.btn-buy').attr('price', _price);

    // Append order information at the end of the orders list
    ordersRow.append(orderTemplate.html());
  },

  /*
    Description
    This function allows to display clients information.
    It also tracks the data provided by the Google Sheets API in order to trigger
    a new checkIn event when a new product has been scanned.

    Argument
    _organisation ("string"): The address of the client's organisation
    _stock (uint): Number of products in stock for the client
    _ordered (uint): Number of products ordered(but not accepted yet) by the client
    _accepted (uint): Number of products ordered and accepted (but not delivered yet) by the client
    _delivered (uint): Number of products delivered by the seller to the client
    _agreedPrice(uint): Agreed price at which products are sold by the seller to the client
    _paid (uint): Number of products that have already been paid by the client
    _seller ("string"): The address of the seller
    _product (uint): The category of product to be dealt with
    _clientNb (uint): The index of the client for the specific product (/!\ This is NOT the global index)

    Return
    Nothing
  */
  displayClient: function(_organisation, _stock, _ordered, _accepted, _delivered, _agreedPrice, _paid, _seller, _product, _clientNb) {
    if(_delivered == 0) {
      App.deleteCookie('date' + _organisation);
      App.deleteCookie('org' + _organisation);
    }
    var clientsRow = $('#clientsRow');
    var clientTemplate = $("#clientTemplate1")
    // Complete text areas with retrieved information
    clientTemplate.find('.panel-title').text("Client " + _clientNb + ": " + _organisation);
    clientTemplate.find('.client-stock').text(_stock);
    clientTemplate.find('.client-ordered').text(_ordered);
    // Adapt displayed text according to the number of products alrady paid
    if(_paid == 0)
      clientTemplate.find('.client-accepted').text(_accepted);
    else if(_paid != 0 && _accepted - _paid == 0)
      clientTemplate.find('.client-accepted').text(_accepted + "  (The product(s) has/have been paid.)");
    else
    clientTemplate.find('.client-accepted').text(_accepted + "  ("+ _paid +"  product(s) has/have been paid.)");
    // Adapt displayed text according to the number of stakeholders who acknowledges receipt of the product
    if(App.getCookie('org' + _organisation) != "")
      clientTemplate.find('.client-delivered').text(_delivered + "(Last Update was on "+ App.getCookie('date' + _organisation) + " by "+ App.getCookie('org' + _organisation) + ")");
    else
      clientTemplate.find('.client-delivered').text(_delivered);
    // Attach attributes to the "Pay" button
    clientTemplate.find('.btn-buy').attr('client', _organisation);
    // Attach attributes to the "Send a new order" button
    clientTemplate.find('.btn-lg').attr('client', _organisation);

    //Display "Pay" button only when there is something to pay
    if(_accepted == 0 || _paid == _accepted ||App.account == _seller)
      clientTemplate.find('.btn-buy').hide();

    // Append order information at the end of the orders list
    clientsRow.append(clientTemplate.html());

    /***************************************************************************
    /!\ This step deals with the retrieval of data from the Google spreadsheet /!\
    1) Test if the data have been correctly retrieved, otherwise relaunch the
       contract initialisation functions
    2) Initialie the value of currLen (number of entries of the Google spreadsheet)
       cookie to be 1
    3) Check if the actual number of lines is grater than currLen and if so
       --> Retrieve QR code info
       --> Check if the QR code was scanned by the final client or a logistics
           intervener and increment currLen by 1
       --> If the QR code was scanned by the final client, call the autoCheckIn
           function, otherwise update date and org cookies
    ***************************************************************************/
    if($('#testLen').val() == "This is a test Length") {
      App.initContract();
    }
    if(App.getCookie('currLen') == '')
      App.setCookie('currLen', 1, 10);
    if(parseInt($('#testLen').val()) > parseInt(App.getCookie('currLen'))) {
      var complete_name = $('#testProduct').val(); // Complete QR code content
      var in_product = complete_name.slice(0, 1); // Poduct category
      var in_product_name = complete_name.slice(2, 12); //Product name (10 characters)
      var client_address = (complete_name.slice(13)).toLowerCase(); //Final client address
      if(App.account == ($('#testOrganisation').val()).toLowerCase() && App.account == client_address) {
        App.updateCookie('currLen', "addition", 1); // Add 1 to actuel currLen value
        App.autoCheckIn(in_product, in_product_name, _product, _clientNb, _seller);
      }
      else if(App.account != $('#testOrganisation') && App.account == client_address) {
        App.updateCookie('currLen', "addition", 1); // Add 1 to actuel currLen value
        App.updateStrCookie("date" + App.account, $('#testDate').val());
        App.updateStrCookie("org" + App.account, $('#testOrganisation').val());
      }
    }
  },

  /*
    Description
    This function allows to add a new client for the product

    Argument
    Nothing

    Return
    Nothing
  */
  addClient: function() {
    // Determine the product for which a client must be added
    if(App.getCookie("select1") != "")
      var _product = 1;
    else if(App.getCookie("select2") != "")
      var _product = 2;
    var _address = $('#client-address').val();
    App.checkExistency(_product, _address);
  },

  /*
    Description
    This function allows to check if a client already exists for a specific product

    Argument
    _product (uint): The category of product to be dealth with
    _address ("string"): The address of the client to be added

    Return
    Nothing
  */
  checkExistency: function(_product, _address) {
    App.contracts.ChainList.deployed().then(function(instance) {
      instance.globalClientCounter().then(function(clients) {
        var _clientsNb = parseInt(clients.toString());
        if(_clientsNb == 0)
          App.addNewClients(_product, _address);
        for(var i = 1; i <= _clientsNb; i++) {
          instance.clients(i).then(function(client) {
            if(client[9] == parseInt(_product) && client[1] == _address.toLowerCase()) {
              App.existency = true;
            }
            if(client[0] == _clientsNb) {
              App.addNewClients(_product, _address);
            }
          })
        }
      })
    });
  },

  /*
    Description
    This function allows to display add only new clients to the database of clients

    Argument
    _product (uint): The category of product to be dealth with
    _address ("string"): The address of the client to be added

    Return
    Nothing
  */
  addNewClients: function(_product, _address) {
    if(App.existency == false) {
      App.contracts.ChainList.deployed().then(function(instance) {
        return instance.addClient(_product, _address, {
          from: App.account,
          gas: 500000
        });
      }).catch(function(err) {
        console.error(err);
      });
      if("date" + _address == "") {
        App.setCookie("date" + _address, "", 10);
        App.setCookie("org" + _address, "", 10);
      }
    }
    else {
      console.log("Client has already been added.");
    }
  },

  /*
    Description
    This function allows to display the stock information provided to each party.

    Argument
    _product (uint): The category of the product to be dealt with

    Return
    Nothing
  */
  displayInfo: function(_product) {
    App.contracts.ChainList.deployed().then(function(instance) {
        instance.stock1(_product-1).then(function(stock) {
          // Hide text areas with Google Sheets API information
          $('#testLen').hide();
          $('#testDate').hide();
          $('#testOrganisation').hide();
          $('#testProduct').hide();
          $('#testAddress').hide();
          // Complete text areas with retrieved information
          var _stock = parseInt(stock.toString());
          $('#stock1').text(_stock);
          instance.MSL1(_product-1).then(function(minStock1) {
            var _MSL1 = parseInt(minStock1.toString());
            $('#minStock1').text(_MSL1);
              if(parseInt(_stock) > parseInt(_MSL1))
                $('#status1').text("Sufficient Stock.");
              else if (parseInt(_stock) == parseInt(_MSL1))
                $('#status1').text("The minimum stock level is achieved.");
              else
                $('#status1').text("Risk to run out of stock.");
                $('#title1').text("Inventory for product " + _product);
        })})
    });
  },

  /*
    Description
    This function allows to display buttons according to the connected account.
    It also relaunches automatic production order when the seller's stock level
    goes below a predefined treshold.

    Argument
    _product (uint): The category of the product to be dealt with.

    Return
    Nothing
  */
  displayButtons: function(_product){
    App.contracts.ChainList.deployed().then(function(instance) {
      instance.ProdA(_product-1).then(function(prod) {
        var _prod = parseInt(prod.toString());
        $('#production1').text(_prod + " product(s) on production.");
          // If the seller is connected...
          instance.seller().then(function(_sellerAddress) {
            if(App.account != _sellerAddress) {
              $('#newOrder1').show();
              $('#validateOrder1').hide();
              $('#releaseOrder1').hide();
              $('#addNewClient').hide();
              $("#seeNewOrder").hide();
              // Otherwise...
            } else {
              $('#newOrder1').hide();
              $('#pay1').hide();
              $('#releaseOrder1').show();
              $('#addNewClient').show();
              $("#seeNewOrder").show();
            }
      })})
    });

     App.contracts.ChainList.deployed().then(function(instance) {
       instance.stock1(_product-1).then(function(stock) {
         var _stock = parseInt(stock.toString());
         instance.ProdA(_product-1).then(function(prod) {
           var _prod = parseInt(prod.toString());
           instance.MSL1(_product-1).then(function(minStock) {
             var _minStock = parseInt(minStock.toString());
             if(_minStock > parseInt(_stock) + parseInt(_prod)) {
               instance.seller().then(function(seller) {
                 _seller = seller.toString();
                 if(App.account == _seller) {
                   return instance.automaticProduction(_product, {
                     from: App.account,
                     gas: 500000
                   });
                 }
               })
             }
           })})})}).catch(function(err) {
        console.error(err);
      });
  },

  /*
    Description
    This function allows to check in a product that has been registered in the
    Google spreadsheet.

    Argument
    _in_product (uint): The category of the product to be checked in.
    _in_product_name ("string"): The name of the product to be checked in.
    _clientNb (uint): The index of the client for the specific product (/!\ This is NOT the global index)

    Return
    Nothing
  */
  autoCheckIn: function(_in_product, _in_product_name, _clientNb, _seller) {
      var _in_product_int = parseInt(_in_product);
      App.contracts.ChainList.deployed().then(function(instance) {
        return instance.autoNewIn(_in_product_name, App.account, _in_product_int, {
          from: App.account,
          gas: 500000
        });
      }).catch(function(err) {
        console.error(err);
      });

      // If the account corresponds to the client, then send money from client
      // to supplier
      if(App.account != _seller) {
        App.contracts.ChainList.deployed().then(function(instance){
          instance.prices1(_in_product-1, _clientNb-1).then(function(price) {
            var _out_price_string = price.toString();
            var _out_price = web3.toWei(parseInt(_out_price_string), "ether");
            return instance.accept(_out_price, {
              from: App.account,
              gas: 500000
            })
          })
        }).catch(function(error) {
          console.error(error);
        });
      }
    },

  /*
    Description
    This function allows the checkIn or checkOut of a product in / out of the stock.

    Argument
    _status (binary) : 1 to checkIn, 2 to checkOut

    Return
    Nothing
  */
  newInOut: function(_status) {
    // **********CHECK IN**********
    if(_status == 1) {
      var _in_product = parseInt($('#in_product').val());
      var _in_product_name = $('#in_product_name').val();
      App.contracts.ChainList.deployed().then(function(instance) {
        return instance.newInOut(App.account, _in_product_name, _in_product, "in", App.account, {
          from: App.account,
          gas: 500000
        });
      }).catch(function(err) {
        console.error(err);
      });

      // If the account corresponds to the client, then send money from client
      // to supplier
      App.contracts.ChainList.deployed().then(function(instance){
        instance.seller().then(function(_sellerAddress) {
          console.log("Je tente de payer");
          var clientNb = parseInt($('#clientNb').html().slice(7,8));
          if(App.account != _sellerAddress) {
            instance.prices1(_in_product-1, clientNb - 1).then(function(price) {
              var _out_price_string = price.toString();
              var _out_price = web3.toWei(parseInt(_out_price_string), "ether");
              return instance.accept(_out_price, {
                from: App.account,
                gas: 500000
              })
            })
        }})
      }).catch(function(error) {
        console.error(error);
      });
    // **********CHECK OUT**********
    } else if(_status == 2) {
      var _out_product = parseInt($('#out_product').val());
      var _out_product_name = $('#out_product_name').val();
      var _out_product_client = $('#out_product_client').val();

      App.contracts.ChainList.deployed().then(function(instance) {
        return instance.newInOut(App.account, _out_product_name, _out_product, "out", _out_product_client, {
          from: App.account,
          gas: 500000
        });
      }).catch(function(err) {
        console.error(err);
      });
    }
  },

  /*
    Description
    This function allows to track a specific product according to its name.
    NB: All related information is displayed in console!!!

    Argument
    nothing

    Return
    Nothing
  */
  track: function() {
    var _traced_product = $('#tracked_product').val();
    App.contracts.ChainList.deployed().then(function(instance) {
      instance.globalCounter().then(function(counter) {
        var _counter = parseInt(counter.toString());
        for(var i = 0; i <= _counter; i++) {
          if(document.getElementById(_traced_product + i) != null) {
            console.log(document.getElementById(_traced_product + i).innerHTML);
          }
        }
      })
    });
  },

  /*
    Description
    This function triggers the ordering process between CMI and the supplier.

    Argument
    Nothing

    Return
    Nothing
  */
  placeOrder: function() {
    event.preventDefault();

    // Determine the product for which an order is placed
    if(App.getCookie("select1") != "")
      var _product = 1;
    else if(App.getCookie("select2") != "")
      var _product = 2;

    var _quantity = $("#order_quantity1").val();
    var _price = $("#order_price1").val();
    App.contracts.ChainList.deployed().then(function(instance) {
      // Display message asking confirmation for order
      if(confirm("You are about to place an order for " + _quantity + " units of product " + _product +
          ". The proposed price is " + _price + " ether(s).")) {
          return instance.placeOrder(App.account, _product, parseInt(_quantity), parseInt(_price), {
            from: App.account,
            gas: 500000
          });
      }
        else {
          window.alert("Transaction cancelled!");
        }
    });
  },

  /*
    Description
    This function allows the supplier to accept an order placed by the client.

    Argument
    _btn (button): The reference to the button being clicked

    Return
    Nothing
  */
  acceptOrder: function(_btn) {
    // Retrieve button attributes
    var _client = _btn.getAttribute('client');
    var _price = _btn.getAttribute('price');
    // Determine the product for which an order is accepted
    if(App.getCookie("select1") != "")
      var _product = 1;
    else if(App.getCookie("select2") != "")
      var _product = 2;
    App.contracts.ChainList.deployed().then(function(instance) {
        instance.globalClientCounter().then(function(clientNb) {
          var _clientNb = parseInt(clientNb.toString());
          for(var i = 1; i <= _clientNb; i++) {
            instance.clients(i).then(function(client) {
              if(client[1] == _client && client[9] == _product){
                var _clientIndex = client[10];
                instance.Ord1(_product-1, _clientIndex-1).then(function(ordered) {
                  var _ordered_string = ordered.toString();
                  var _ordered = parseInt(_ordered_string);
                  var _finalPrice = _price*_ordered;
                  instance.stock1(_product-1).then(function(stock) {
                    var _stock_string = stock.toString();
                    var _stock = parseInt(_stock_string);
                    // Display message asking confirmation for order acceptance
                    if(confirm("You are about to sell " + _ordered + " products of type " + _product +
                        " for " + _finalPrice + " ETH.")) {
                        return instance.acceptOrder(parseInt(_product), _client, {
                          from: App.account,
                          gas: 500000
                        });
                      App.displayAccountInfo();
                    }
                    else {
                      window.alert("Transaction cancelled!");
                    }

                })})
              }
            })
          }
        })
    });
  },

  /*
    Description
    This function allows the release a new production order from the producer.

    Arguments
    Nothing

    Return
    Nothing
  */
  releaseOrder: function() {
    // Determine the product for which an order is accepted
    if(App.getCookie("select1") != "")
      var _product = 1;
    else if(App.getCookie("select2") != "")
      var _product = 2;
    App.contracts.ChainList.deployed().then(function(instance) {
      return instance.seller().then(function(seller) {
        _seller = seller.toString();
        if(App.account == _seller) {
          // Display message asking confirmation for order acceptance
          if(confirm("You are about to release a production order for 1 unit of product " + _product)) {
            return instance.releaseOrder(_product, {
              from: App.account,
              gas: 500000
            });
          }
          else {
            window.alert("Order cancelled!");
          }
        }
      })
    })
  },

  /*
    Description
    This function allows the client to block the money on the contract account
    after the order has been accepted by the seller.

    Argument
    _btn (button): The reference to the button being clicked

    Return
    Nothing
  */
  pay: function(_btn) {
    // Retrieve button attributes
    var _client = _btn.getAttribute('client');
    // Determine the product for which the client will pay
    if(App.getCookie("select1") != "")
      var _product = 1;
    else if(App.getCookie("select2") != "")
      var _product = 2;

    App.contracts.ChainList.deployed().then(function(instance) {
        instance.globalClientCounter().then(function(clientNb) {
          _clientNb = parseInt(clientNb.toString());
          for(var i = 1; i <= _clientNb; i++) {
            instance.clients(i).then(function(client) {
              if(client[9] == _product) {
                if(client[1] == _client){
                  var indexAccount = client[10]; // Returns client ID
                  instance.Acc1(_product-1, indexAccount - 1).then(function(accepted) {
                    var _accepted = parseInt(accepted.toString());
                    instance.Pay1(_product-1, indexAccount - 1).then(function(paid) {
                      var _paid = parseInt(paid.toString());
                      instance.prices1(_product-1, indexAccount - 1).then(function(price) {
                        var _price = parseInt(price.toString());
                        var priceToPay = (_accepted - _paid)*_price;
                        return instance.deposit(_client, _product, {
                          from: App.account,
                          value: web3.toWei(priceToPay, "ether"),
                          gas: 500000
                        });
                  })})})
                }
              }
            })
          }
        })
    });
  },

  /*
    Description
    This function listens to the events triggered by the contract.

    Argument
    Nothing

    Return
    Nothing
  */
  listenToEvents: function() {
    App.contracts.ChainList.deployed().then(function(instance) {
      if(App.loading2) {
        return;
      }
      App.loading2 = true;

      instance.logProductInOut({}, {fromBlock:0, toBlock:'latest'}).watch(function(error, event) {
        if(!error) {
          if(event.args._status == "in")
            $('#events').append('<li id="'+ event.args._name + event.args._globalCounter + '" class="list-group-item"> A unit of product ' + event.args._product + ' has entered on ' + new Date(event.args._date*1000) + ' (name ' + event.args._name + '). The new stock level of ' + event.args._organisation +' is ' + event.args._stock + '.</li>');
          else if(event.args._status == "out")
            $('#events').append('<li id="'+ event.args._name + event.args._globalCounter + '" class="list-group-item"> A unit of product ' + event.args._product + ' has leaved on ' + new Date(event.args._date*1000) + ' (name ' + event.args._name + '). The new stock level of ' + event.args._organisation +' is ' + event.args._stock + '.</li>');

        } else {
          console.error(error);
        }
      });
    });
    App.loading2 = false;
  }
}

$(function() {
  $(window).load(function() {
    App.init();
  });
});
