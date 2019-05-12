App = {
  web3Provider: null,
  contracts: {},
  loading: false,
  loading2: false,
  existency: false,
  seller: null,
  init: function() {
    return App.initWeb3();
  },

  /*
    Description
    This function allows to update the value of an integer cookie

    Argument
    cname ("string"): The name of the Cookie to be updated
    op ("string"): The type of operation to be perfomed (addition or soustraction)
    val_update (uint): The value to be added or substracted

    Return
    Nothing
  */
  updateCookie: function(cname, op, val_update) {
    var temp = parseInt(App.getCookie(cname));
    App.deleteCookie(cname);
    if(op == "addition")
      App.setCookie(cname, parseInt(temp) + parseInt(val_update), 10);
    if(op == "soustraction")
      App.setCookie(cname, parseInt(temp) - parseInt(val_update), 10);
  },

  /*
    Description
    This function allows to update the value of a string cookie

    Argument
    cname ("string"): The name of the Cookie to be updated
    new_str ("string"): The new value for the cookie

    Return
    Nothing
  */
  updateStrCookie: function(cname, new_str) {
    App.deleteCookie(cname);
    App.setCookie(cname, new_str, 10);
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
      if (c.indexOf(name) == 0)
        return c.substring(name.length, c.length);
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
    //App.updateCookie('currLen', "soustraction", 3);
    // initialize web3
    if(typeof web3 !== 'undefined')
      //reuse the provider of the Web3 object injected by Metamask
      App.web3Provider = web3.currentProvider;
    else
      //create a new provider and plug it directly into our local node
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');

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
    $('#testLen').hide();
    $('#testDate').hide();
    $('#testOrganisation').hide();
    $('#testProduct').hide();
    $('#testAddress').hide();
    web3.eth.getCoinbase(function(err, account) {
      if(err === null) {
        App.account = account;
        $('#account').text(account);
        web3.eth.getBalance(App.account, function(err, balance) {
          if(err === null)
            // Display the balance of the account
            $('#accountBalance').text(web3.fromWei(balance, "ether") + " ETH");
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

      App.contracts.ChainList.deployed().then(function(instance) {
        return instance.seller();
      }).then(function(seller_address) {
        var seller_address_web3 = (seller_address.toString());
        App.seller = seller_address_web3;

        if(App.getCookie("select1") != "") {
          App.displayButtons(1);
          App.displayInfo(1);
          App.reloadClientsOrders(1);
        }
        else if(App.getCookie("select2") != "") {
          App.displayButtons(2);
          App.displayInfo(2);
          App.reloadClientsOrders(2);
        }
      })

      App.retrieveSpreadSheetInfo();
      // listen to events
      App.listenToEvents();
    });
  },

  retrieveSpreadSheetInfo: function() {
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
    if($('#testLen').val() == "This is a test Length")
      setTimeout(App.retrieveSpreadSheetInfo, 300);
    else {
      if(App.getCookie('currLen') == '')
        App.setCookie('currLen', 1, 10);
      if(parseInt($('#testLen').val()) > parseInt(App.getCookie('currLen'))) {
        var complete_name = $('#testProduct').val(); // Complete QR code content
        var in_product = complete_name.slice(0, 1); // Poduct category
        var in_product_name = complete_name.slice(2, 12); //Product name (10 characters)
        var client_address = (complete_name.slice(13)).toLowerCase(); //Final client address
        if(App.account == ($('#testOrganisation').val()).toLowerCase() && App.account == client_address) {
          App.contracts.ChainList.deployed().then(function(instance) {
            return instance.clients(client_address);
          }).then(function(client_struct) {
            if(client_struct[7] == in_product) {
              App.autoCheckIn(in_product, in_product_name, client_address);
              App.updateCookie('currLen', "addition", 1); // Add 1 to actuel currLen value
            }
          }).catch(function(err) {
            console.error(err.message);
          });
        }
        else if(App.account == ($('#testOrganisation').val()).toLowerCase()) {
          App.addStep(in_product_name, in_product, client_address);
          App.updateCookie('currLen', "addition", 1); // Add 1 to actuel currLen value
        }
      }
    }
  },

  /*
    Description
    This function allows to update orders and clients information

    Argument
    product (uint): The type of product to be dealt with

    Return
    Nothing
  */
  reloadClientsOrders: function(product) {
    if(App.loading)
      return;
    App.loading = true;

    App.displayAccountInfo();

    App.contracts.ChainList.deployed().then(function(instance) {
      return instance.global_client_counter()
      }).then(function(clients_nb) {
        // retrieve the order placeholder and clear it
        $('#ordersRow').empty();
        // retrieve the client placeholder and clear it
        $('#clientsRow').empty();
        for(var i = 0; i < parseInt(clients_nb); i++) {
          App.retrieveOrderInfo(product, i);
          App.retrieveClientInfo(product, i);
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
    product (uint): The type of product to be dealt with
    client_nb(uint): The global index of the client to be dealt with

    Return
    Nothing
  */
  retrieveOrderInfo: function(product, index) {
  App.contracts.ChainList.deployed().then(function(instance) {
    // Retrieve the client structure mapped to the index _clientNb+1
    return instance.clients_add(product - 1, index).then(function(client_add) {
      return instance.clients(client_add).then(function(client_struct) {
      // If an order has been placed by the client, display it
      if(client_struct[5] != 0)
        App.displayOrder(client_struct[0], client_struct[6], client_struct[5]);
  })})}).catch(function(err) {
    console.error(err.message);
  });
  },

  /*
    Description
    This function allows to retrieve clients information

    Argument
    product (uint): The type of product to be dealt with
    client_nb(uint): The global index of the client to be dealt with

    Return
    Nothing
  */
  retrieveClientInfo: function(product, index) {
    App.contracts.ChainList.deployed().then(function(instance) {
      // Retrieve the client structure mapped to the index _clientNb+1
      return instance.clients_add(product - 1, index).then(function(client_add) {
        return instance.clients(client_add).then(function(client_struct) {
          if(App.account == App.seller || App.account == client_add)
            App.displayClient(client_struct[0], client_struct[1], client_struct[5], client_struct[2], client_struct[3], client_struct[6], client_struct[8]);
    })})}).catch(function(err) {
      console.error(err.message);
    });
  },

  /*
    Description
    This function allows to display orders information

    Argument
    address ("string"): The address of the client having placed the order
    price (uint): The proposed price for the order (/!\ 1 per client)
    ordered (uint): The amount of products ordred

    Return
    Nothing
  */
  displayOrder: function(address, price, ordered) {
    var orders_row = $('#ordersRow');

    var order_template = $('#orderRequestTemplate');
    // Complete text areas with retrieved information
    order_template.find('.order-client').text(address);
    order_template.find('.order-quantity').text(ordered);
    order_template.find('.order-price').text(parseInt(price));
    // Attach attributes to the "Accept" button
    order_template.find('.btn-buy').attr('client', address);
    order_template.find('.btn-buy').attr('price', price);

    // Append order information at the end of the orders list
    orders_row.append(order_template.html());
  },

  /*
    Description
    This function allows to display clients information.
    It also tracks the data provided by the Google Sheets API in order to trigger
    a new checkIn event when a new product has been scanned.

    Argument
    organisation ("string"): The address of the client's organisation
    stock (uint): Number of products in stock for the client
    ordered (uint): Number of products ordered(but not accepted yet) by the client
    accepted (uint): Number of products ordered and accepted (but not delivered yet) by the client
    delivered (uint): Number of products delivered by the seller to the client
    agreedPrice(uint): Agreed price at which products are sold by the seller to the client
    paid (uint): Number of products that have already been paid by the client
    product (uint): The category of product to be dealt with
    clientNb (uint): The index of the client for the specific product (/!\ This is NOT the global index)

    Return
    Nothing
  */
  displayClient: function(organisation, stock, ordered, accepted, delivered, price, deposit) {
    var clients_row = $('#clientsRow');
    var client_template = $("#clientTemplate1")
    // Complete text areas with retrieved information
    client_template.find('.panel-title').text("Client : " + organisation);
    client_template.find('.client-stock').text(stock);
    client_template.find('.client-ordered').text(ordered);
    client_template.find('.client-delivered').text(delivered);
    // Adapt displayed text according to the number of products alrady paid
    if(accepted > 0 && parseInt(web3.toWei(deposit, "ether")) > parseInt(delivered) * parseInt(price))
      client_template.find('.client-accepted').text(accepted + "  (The product(s) has/have been paid.)");
    else
      client_template.find('.client-accepted').text(accepted);
    // Attach attributes to the "Pay" and 'Refund" buttons
    $('#pay').attr('client', organisation);
    $('#refund').attr('client', organisation);
    // Attach attributes to the "Send a new order" button
    client_template.find('.btn-lg').attr('client', organisation);

    //Display "Pay" button only when there is something to pay
    if(accepted == 0 || parseInt(web3.toWei(deposit, "ether")) == (parseInt(delivered) + parseInt(accepted)) * parseInt(price) || App.account == App.seller)
      $('#pay').hide();

    //Diplay "Refund" button only when paid accepted products have not been delivered yet
    if(deposit <= delivered * price || accepted == 0 || App.account == App.seller)
      $('#refund').hide();

    // Append order information at the end of the orders list
    clients_row.append(client_template.html());
  },

  /*
    Description
    This function allows a logistics partner to acknwoledge reception of the product

    Argument
    product_name ("string"): The name of the received product
    product_categort (uint): The product category
    client ("string"): The client's address

    Return
    Nothing
  */
  addStep: function(product_name, product_category, client) {
    App.contracts.ChainList.deployed().then(function(instance) {
      return instance.addStep(App.account, product_name, product_category, client, {
        from: App.account,
        gas: 500000
      });
    }).catch(function(err) {
      console.error(err);
    });
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
    var product;
    App.getCookie('select1') != "" ? product = 1 : product = 2;
    var address = $('#client-address').val();
    //App.checkExistency(product, address);
    App.contracts.ChainList.deployed().then(function(instance) {
      return instance.addClient(parseInt(product), address, {
        from: App.account,
        gas: 500000
      });
    }).catch(function(err) {
      console.error(err);
    });
  },

  /*
    Description
    This function allows to display the stock information provided to each party.

    Argument
    product (uint): The category of the product to be dealt with

    Return
    Nothing
  */
  displayInfo: function(product) {
    $('#title1').text("Inventory for product " + product);
    App.contracts.ChainList.deployed().then(function(instance) {
      instance.stock(product - 1).then(function(stock) {
        $('#stock1').text(parseInt(stock));
        instance.msl(product - 1).then(function(min_stock) {
          $('#minStock1').text(parseInt(min_stock));
          if(parseInt(stock) > parseInt(min_stock))
            $('#status1').text("Sufficient Stock.");
          else if (parseInt(stock) == parseInt(min_stock))
            $('#status1').text("The minimum stock level is achieved.");
          else
            $('#status1').text("Risk to run out of stock.");
    })})}).catch(function(err) {
      console.error(err.message);
    });
  },

  /*
    Description
    This function allows to display buttons according to the connected account.
    It also relaunches automatic production order when the seller's stock level
    goes below a predefined treshold.

    Argument
    product (uint): The category of the product to be dealt with.

    Return
    Nothing
  */
  displayButtons: function(product){
    App.contracts.ChainList.deployed().then(function(instance) {
      return instance.prod(product - 1)
    }).then(function(on_production) {
      var on_production_web3 = parseInt(on_production);
      $('#production1').text(on_production_web3 + " product(s) on production.");
    }).catch(function(err) {
      console.error(err.message);
    });

    // If the seller is connected...
    if(App.account != App.seller) {
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

     App.contracts.ChainList.deployed().then(function(instance) {
       instance.stock(product - 1).then(function(stock) {
         instance.prod(product - 1).then(function(on_production) {
           instance.msl(product - 1).then(function(min_stock) {
             if(parseInt(min_stock) > parseInt(stock) + parseInt(on_production) && App.account == App.seller) {
                 return instance.autoProduction(product, {
                   from: App.account,
                   gas: 500000
                 });
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
    in_product (uint): The category of the product to be checked in.
    in_product_name ("string"): The name of the product to be checked in.
    clientNb (uint): The index of the client for the specific product (/!\ This is NOT the global index)

    Return
    Nothing
  */
  autoCheckIn: function(in_product, in_product_name, client_address) {
    var in_product_int = parseInt(in_product);
    App.contracts.ChainList.deployed().then(function(instance) {
      return instance.autoNewIn(in_product_name, App.account, in_product_int, {
        from: App.account,
        gas: 500000
      });
    }).catch(function(err) {
      console.error(err);
    });

    // If the account corresponds to the client, then send money from client
    // to supplier
    if(App.account != App.seller) {
      App.contracts.ChainList.deployed().then(function(instance) {
        instance.clients(client_address).then(function(client_struct) {
        var price_web3 = web3.toWei(parseInt(client_struct[6]), "ether");
        return instance.withdraw(price_web3, App.account, {
          from: App.account,
          gas: 500000
        });
      })}).catch(function(err) {
        console.error(err);
      });
    }
  },

  /*
    Description
    This function allows the checkIn or checkOut of a product in / out of the stock.

    Argument
    status (binary) : 1 to checkIn, 2 to checkOut

    Return
    Nothing
  */
  newInOut: function(status) {
    // **********CHECK IN**********
    if(status == 1) {
      var in_product;
      App.getCookie('select1') != "" ? in_product = 1 : in_product = 2;
      var in_product_name = $('#in_product_name').val();
      App.contracts.ChainList.deployed().then(function(instance) {
        return instance.newInOut(App.account, in_product_name, in_product, "in", App.account, {
          from: App.account,
          gas: 500000
        });
      }).catch(function(err) {
        console.error(err);
      });

      // If the account corresponds to the client, then send money from client
      // to supplier
      if(App.account != App.seller) {
        var client_address = $('#clientNb').html().slice(9);
        App.contracts.ChainList.deployed().then(function(instance){
          instance.clients(client_address).then(function(client_struct) {
            var price_web3 = web3.toWei(parseInt(client_struct[6]), "ether");
            return instance.withdraw(price_web3, App.account, {
              from: App.account,
              gas: 500000
            });
        })}).catch(function(error) {
            console.error(error);
        });
      }
    // **********CHECK OUT**********
    } else if(status == 2) {
      var out_product;
      App.getCookie('select1') != "" ? out_product = 1 : out_product = 2;
      var out_product_name = $('#out_product_name').val();
      var out_product_client = $('#out_product_client').val();

      App.contracts.ChainList.deployed().then(function(instance) {
        return instance.newInOut(App.account, out_product_name, out_product, "out", out_product_client, {
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
    Nothing

    Return
    Nothing
  */
  track: function() {
    var traced_product = $('#tracked_product').val();
    App.contracts.ChainList.deployed().then(function(instance) {
      return instance.listID()
    }).then(function(counter) {
      for(var i = 0; i <= parseInt(counter); i++) {
        if(document.getElementById(traced_product + i) != null)
          console.log(document.getElementById(traced_product + i).innerHTML);
      }
    }).catch(function(err) {
      console.error(err.message);
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
    var product;
    App.getCookie('select1') != "" ? product = 1 : product = 2;

    var quantity = $("#order_quantity1").val();
    var price = $("#order_price1").val();
    App.contracts.ChainList.deployed().then(function(instance) {
      // Display message asking confirmation for order
      if(confirm("You are about to place an order for " + quantity + " units of product " + product +
          ". The proposed price is " + price + " ether(s).")) {
          return instance.placeOrder(App.account, parseInt(quantity), parseInt(price), {
            from: App.account,
            gas: 500000
          }).catch(function(err) {
            console.error(err.message);
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
    btn (button): The reference to the button being clicked

    Return
    Nothing
  */
  acceptOrder: function(btn) {
    // Retrieve button attributes
    var client_btn = btn.getAttribute('client');
    var price = btn.getAttribute('price');
    // Determine the product for which an order is accepted
    var product;
    App.getCookie('select1') != "" ? product = 1 : product = 2;

    App.contracts.ChainList.deployed().then(function(instance) {
      return instance.clients(client_btn).then(function(client_struct) {
        var finalPrice = client_struct[5] * price;
        // Display message asking confirmation for order acceptance
        if(confirm("You are about to sell " + client_struct[5] + " products of type " + product +
            " for " + finalPrice + " ETH.")) {
          return instance.acceptOrder(client_btn, {
            from: App.account,
            gas: 500000
          });
          App.displayAccountInfo();
        }
        else
          window.alert("Transaction cancelled!");
      })}).catch(function(err) {
        console.error(err.message);
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
    var product;
    App.getCookie('select1') != "" ? product = 1 : product = 2;

    App.contracts.ChainList.deployed().then(function(instance) {
      if(App.account == App.seller) {
        // Display message asking confirmation for order acceptance
        if(confirm("You are about to release a production order for 1 unit of product " + product)) {
          return instance.releaseOrder(product, {
            from: App.account,
            gas: 500000
          });
        }
        else
          window.alert("Order cancelled!");
      }
    })
  },

  /*
    Description
    This function allows the client to block the money on the contract account
    after the order has been accepted by the seller.

    Argument
    btn (button): The reference to the button being clicked

    Return
    Nothing
  */
  pay: function(btn) {
    // Retrieve button attributes
    var client_btn = btn.getAttribute('client');
    // Determine the product for which the client will pay
    var product;
    App.getCookie('select1') != "" ? product = 1 : product = 2;

    App.contracts.ChainList.deployed().then(function(instance) {
      return instance.clients(client_btn).then(function(client_struct) {
        var price_to_pay = client_struct[2] * client_struct[6];
        return instance.deposit(client_btn, {
          from: App.account,
          value: web3.toWei(price_to_pay, "ether"),
          gas: 500000
        });
      })
    }).catch(function(err) {
      console.error(err.message);
    });
  },

  /*
    Description
    This function allows the client to block the money on the contract account
    after the order has been accepted by the seller.

    Argument
    btn (button): The reference to the button being clicked

    Return
    Nothing
  */
  refund: function(btn) {
    // Retrieve button attributes
    var client_btn = btn.getAttribute('client');

    App.contracts.ChainList.deployed().then(function(instance) {
      return instance.clients(client_btn).then(function(client_struct) {
        var amount_to_refund = web3.toWei(client_struct[2] * client_struct[6], "ether");
        return instance.refund(client_btn, amount_to_refund, {
          from: App.account,
          gas: 500000
        });
      })
    }).catch(function(err) {
      console.error(err.message);
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
      if(App.loading2)
        return;
      App.loading2 = true;

      instance.LogProductInOut({}, {fromBlock:0, toBlock:'latest'}).watch(function(error, event) {
        if(!error) {
          if(event.args.status == "in" && (event.args.organisation == App.account || event.args.client == App.account))
            $('#events').append('<li id="'+ event.args.name + event.args.listID + '" class="list-group-item"> A unit of product ' + event.args.product + ' has entered on ' + new Date(event.args.date*1000) + ' (name ' + event.args.name + '). The new stock level of ' + event.args.organisation +' is ' + event.args.stock + '.</li>');
          else if(event.args.status == "out" && (event.args.organisation == App.account || event.args.client == App.account))
            $('#events').append('<li id="'+ event.args.name + event.args.listID + '" class="list-group-item"> A unit of product ' + event.args.product + ' has leaved on ' + new Date(event.args.date*1000) + ' (name ' + event.args.name + '). The new stock level of ' + event.args.organisation +' is ' + event.args.stock + ' (Destination: '+ event.args.client +').</li>');
        } else {
          console.error(error);
        }
      });

      instance.LogNewLocation({}, {fromBlock:0, toBlock:'latest'}).watch(function(error, event) {
        if(!error && (event.args.organisation == App.account || event.args.client == App.account))
          $('#events').append('<li id="'+ event.args.name + event.args.listID + '" class="list-group-item"> A unit of product ' + event.args.product + ' has been received by' + event.args.organisation +  ' on ' + new Date(event.args.date*1000) + ' (name ' + event.args.name + ', destination ' + event.args.client + ').</li>');
        else
          console.error(error);
      });

      instance.LogChangePrice({}, {fromBlock:'latest', toBlock:'latest'}).watch(function(error, event) {
        if(!error && App.account == event.args.organisation)
          window.alert("Price for the " + event.args.quantity + " ordered product(s) has changed. The new agreed price is " + event.args.price + ".");
        else
          console.error(error);
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
