var GoogleSpreadsheet = require('google-spreadsheet');
var creds = require('./client_secret.json');

// Create a document object using the ID of the spreadsheet - obtained from its URL.
var doc = new GoogleSpreadsheet('1-XPV9sN_rRDdG-XEyfwlrSFW2xESQjWLT3bJCuvsvCw');

// Authenticate with the Google Spreadsheets API.
doc.useServiceAccountAuth(creds, function (err) {

  // Get all of the rows from the spreadsheet.
  doc.getRows(1, function (err, rows) {
    console.log("Je suis la ");
    console.log(rows[rows.length-1].timestamp);
    console.log(rows[rows.length-1].scanneddata);
    console.log(rows[rows.length-1].location);
    //console.log("The total number of rows is : " + rows.length);
  });
});

//*******************************************************************//
// Ceci fonctionne en console avec la commande node spreadsheet.js   //
// J'aimerais intégrer ce code au fichier app.js pour avoir les infos//
// au niveau de l'interface Web...
//*******************************************************************//
