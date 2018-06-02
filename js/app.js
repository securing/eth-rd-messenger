App = {
  INFO: " (visit: http://damianrusinek.githubio/rdeth)",
  web3Provider: null,
  web3NetworkId: null,
  address: null,
  ownerPubKey: null,
  encryptedBytesArray: null,
  dataToDecrypt: null,

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    // Is there an injected web3 instance?
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
    } else {
      App.web3Provider = null;
    }
    //web3 = new Web3(App.web3Provider);

    return App.bindEvents();
  },

  bindEvents: function() {
    App.initMoreInfo();
    if (App.web3Provider) {
      web3 = new Web3(App.web3Provider);
      web3.version.getNetwork((e, netId) => {
        if (e) {
          $('.web3-net-error').removeClass('hidden');
          throw e;
        } else if (netId == 1 || netId == 3){
          App.web3NetworkId = parseInt(netId);
          Api.init(App.web3NetworkId);
          App.initNetworkInfo();
          App.initPanels();
          App.initEncryptionPanel();
          App.initDecryptionPanel();
        } else {
          $('.web3-unsupported-net-error').removeClass('hidden');
        }
      });
    } else {
      $('.no-web3-error').removeClass('hidden');
    }
  },

  initMoreInfo: function() {
    // Show/Hide more info buttons
    $('button.more-info').text('Show more info...');
    $('button.more-info').click(function() {
      if ($('div.more-info').is(':visible')) {
        $('button.more-info').text('Show more info...');
      } else {
        $('button.more-info').text('Hide more info');
      }
      $('div.more-info').toggle();
    });
  },

  initNetworkInfo: function() {
    if (App.web3NetworkId == 1) {
      $('div.network-info').html('Using MAINNET network.');
    } else {
      $('div.network-info').html('Using ROPSTEN network.');
    }
  },

  initPanels: function() {
    $('.panels-buttons').removeClass('hidden');
    $('.panels-buttons button.btn-encrypt-panel').addClass('active');
    $('.encrypt-panel').removeClass('hidden');

    $('.panels-buttons button.btn-encrypt-panel').click(function() {
      $('.encrypt-panel').removeClass('hidden');
      $('.decrypt-panel').addClass('hidden');
    });

    $('.panels-buttons button.btn-decrypt-panel').click(function() {
      $('.encrypt-panel').addClass('hidden');
      $('.decrypt-panel').removeClass('hidden');
    });
  },

  initEncryptionPanel: function() {
    $('button.load-key').click(function() {
      App.startLoadingKey();
    });
    $('input[name="receiver-address"]').keyup(function(e) {
      if (e.keyCode == 13) {
        $('button.load-key').click();
      }
    });

    $('button.encrypt-message').click(function() {
      App.encryptMessage();
    });
    $('input[name="message"]').keyup(function(e) {
      if (e.keyCode == 13) {
        $('button.encrypt-message').click();
      }
    });

    $('input[name="add-info"]').change(function(e) {
      $('div.send-info').html('');      
      App.addSendInfoMsg('Message to be sent:');
      App.addSendInfoMsg(ethereumjs.Util.bufferToHex(App.getDataToSend()));
    });

    $('button.send-message').click(function() {
      App.sendMessage();
    });
  },

  initDecryptionPanel: function() {
    $('button.load-encrypted-tx').click(function() {
      App.loadTransactionToDecrypt();
    });
    $('input[name="encrypted-tx-hash"]').keyup(function(e) {
      if (e.keyCode == 13) {
        $('button.load-encrypted-tx').click();
      }
    });

    $('button.decrypt-message').click(function() {
      App.decryptMessage();
    });
    $('input[name="private-key"]').keyup(function(e) {
      if (e.keyCode == 13) {
        $('button.decrypt-message').click();
      }
    });
  },

  startLoadingKey: function() {
    $('button.load-key').attr("disabled", true);
    $('div.message-row').addClass('hidden');
    $('div.send-row').addClass('hidden');
    web3 = new Web3(App.web3Provider);
    $('div.load-key-error-console').addClass('hidden');
    $('div.load-key-console').addClass('hidden');
    $('div.load-key-error-console').html('');
    $('div.load-key-console').html('');
    App.ownerPubKey = null;

    try {
      var address = $('input[name="receiver-address"]').val();
      App.address = address;
      App.checkIfAddressIsContract(address)
      .then((isContract) => {
        if (isContract) { // Contract
          App.addLoadConsoleMsg('This is contract address. Looking for creation transaction...');
          return Api.getCreationTransacionHash(address)
          .then((txHash) => {
            App.addLoadConsoleMsg('Found transaction: <a href="' + App.getEtherScanBaseUrl() + 
                              'tx/' + txHash +  '">' + txHash +  '</a>');
            return App.getEthTransactionFromBlockchain(txHash);
          })
        } else { // Personal
          App.addLoadConsoleMsg('This is personal address. Looking for any output transaction...');
          return Api.getOutTransactionHash(address)
          .then((txHash) => {
            App.addLoadConsoleMsg('Found transaction: <a href="' + App.getEtherScanBaseUrl() + 
                              'tx/' + txHash +  '">' + txHash +  '</a>');
        
            return App.getEthTransactionFromBlockchain(txHash);
          })
        }
      })
      // Recover public key
      .then((tx) => {
        var pubkey = tx.getSenderPublicKey();
        App.ownerPubKey = pubkey;

        var pubKeyHex = '0x' + pubkey.toString('hex');
        var ownerAddressHex = '0x' + tx.getSenderAddress().toString('hex');
        var url = App.getEtherScanBaseUrl();
        
        App.addLoadConsoleMsg('Owner address: <a href="' + url + 
                              'address/' + ownerAddressHex +  '">' 
                              + ownerAddressHex +  '</a>');
        App.addLoadConsoleMsg('Public key: ' + pubKeyHex);

        $('button.load-key').attr("disabled", false);
        $('div.message-row').removeClass('hidden');

      })
      .catch((e) => {
        App.showLoadError(e.message);
        $('button.load-key').attr("disabled", false);
      });
    } catch (e) {
      App.showLoadError(e.message);
    }
  },

  encryptMessage: function() {
    $('button.encrypt-message').attr("disabled", true);
    web3 = new Web3(App.web3Provider);
    $('div.encrypt-error-console').addClass('hidden');
    $('div.encrypt-console').addClass('hidden');
    $('div.encrypt-error-console').html('');
    $('div.encrypt-console').html('');

    try {

      if (App.ownerPubKey == null) {
        App.showEncryptError('Please read the public key first.');
        $('button.encrypt-message').attr("disabled", false);
        return;
      }
    
      var message = $('input[name="message"]').val();
      var encryptedBytesArray = App.encrypt(message, App.ownerPubKey);
      App.encryptedBytesArray = encryptedBytesArray;

      $('button.encrypt-message').attr("disabled", false);
      $('div.send-row').removeClass('hidden');
      
      $('div.send-info').html('');      
      App.addSendInfoMsg('Message to be sent:');
      App.addSendInfoMsg(ethereumjs.Util.bufferToHex(App.getDataToSend()));

    } catch (e) {
      App.showEncryptError(e.message);
    }
  },

  sendMessage: function () {
    $('div.send-error-console').addClass('hidden');
    $('div.send-console').addClass('hidden');
    $('div.send-error-console').html('');
    $('div.send-console').html('');
    
    var fromAccount = web3.eth.defaultAccount;
    if (!fromAccount) {
      App.showSendError('Error on sending message:');
      App.showSendError('No default account found. Have you unlocked your wallet?');
      return;
    }
    
    try {
      var gasLimit = App.getDataToSend().length / 32 * 20000 + 21000;
      web3.eth.sendTransaction({
          to: App.address,
          data: ethereumjs.Util.bufferToHex(App.getDataToSend()),
          gas: gasLimit,
        },
        (err,txHash) => {
          if (err) {
            App.showSendError('Error on sending message:');
            App.showSendError(err.message);
          } else {
            App.addSendConsoleMsg('Transaction: <a href="' + App.getEtherScanBaseUrl() + 
                              'tx/' + txHash +  '">' + txHash +  '</a>');
          }
      });
    } catch (e) {
      App.showSendError(e.message);
    }
  },

  loadTransactionToDecrypt: function() {
    $('button.load-encrypted-tx').attr("disabled", true);
    $('div.decrypt-row').addClass('hidden');
    web3 = new Web3(App.web3Provider);
    $('div.load-tx-error-console').addClass('hidden');
    $('div.load-tx-console').addClass('hidden');
    $('div.load-tx-error-console').html('');
    $('div.load-tx-console').html('');
    App.dataToDecrypt = null;

    try {
      var encryptedTxHash = $('input[name="encrypted-tx-hash"]').val();
      App.encryptedTxHash = encryptedTxHash;

      App.getEthTransactionFromBlockchain(App.encryptedTxHash)
      .then((tx) => {
        $('button.load-encrypted-tx').attr("disabled", false);
        App.addLoadTxConsoleMsg('Transaction loaded!');
        App.addLoadTxConsoleMsg('Data: 0x' + tx.data.toString('hex'));
        App.dataToDecrypt = App.removeInfoMsg(tx.data).slice(1);

        $('div.decrypt-row').removeClass('hidden'); 
      })
      .catch((e) => {
        App.showLoadTxError(e.message);
        $('button.load-encrypted-tx').attr("disabled", false);
      });

    } catch (e) {
      App.showLoadError(e.message);
    }
  },

  decryptMessage: function() {
    $('button.decrypt-message').attr("disabled", true);
    $('div.decrypt-error-console').addClass('hidden');
    $('div.decrypt-console').addClass('hidden');
    $('div.decrypt-error-console').html('');
    $('div.decrypt-console').html('');

    try {

      if (App.dataToDecrypt == null) {
        App.showDecryptError('Please read the transaction first.');
        $('button.decrypt-message').attr("disabled", false);
        return;
      }
    
      var privKey = new ethereumjs.BN($('input[name="private-key"]').val(), "hex");
      var decrypted = App.decrypt(App.dataToDecrypt, privKey);

      var arrayToutf8 = function(arr) {
        var msg = "";
        for (var i = 0; i < arr.length; i++) {
          msg += String.fromCharCode(arr[i]);;
        }
        return msg;
      };

      $('button.decrypt-message').attr("disabled", false);
      $('div.decrypt-console').removeClass('hidden');
      
      $('div.decrypt-console').html('');      
      App.addDecryptConsoleMsg('Decrypted message:');
      App.addDecryptConsoleMsg(arrayToutf8(decrypted));

    } catch (e) {
      App.showDecryptError(e.message);
    }
  },

  getDataToSend: function() {
    var dataToSend = [0];
    Array.prototype.push.apply(dataToSend, App.encryptedBytesArray);

    var utf8ToArray = function(msg) {
      var arr = [];
      for (var i = 0; i < msg.length; i++) {
        arr.push(msg.charCodeAt(i));
      }
      return arr;
    };

    if ($('input.add-info').is(':checked')) {
      Array.prototype.push.apply(dataToSend, utf8ToArray(App.INFO));
    }
    return dataToSend;
  },

  encrypt: function(message, pubkeyBytes) {
    var ec = new elliptic.ec('secp256k1');
    ecKey = ec.keyFromPublic({x: pubkeyBytes.slice(0, 32), y: pubkeyBytes.slice(32, 64)});
    
    var findECRandom = function(N) {
      var rArr, rBN;
      while (1) {
        rArr = new Uint8Array(N.toArray().length);
        rArr = crypto.getRandomValues(rArr);
        rBN = new ethereumjs.BN(rArr);
        if (rBN.cmp(elliptic.curves.secp256k1.n) < 0) {
          return rBN;
        }
      }
    };

    // Generate random r and point g^r
    var rEC = findECRandom(ec.n);
    var pointR = ec.g.mul(rEC);
    
    var Sx = ecKey.pub.mul(rEC).x;
    var key = ethereumjs.Util.sha3(Sx);

    // Random prefix for AES CTR mode
    var prefixAES = new Uint8Array(4);
    prefixAES = crypto.getRandomValues(prefixAES);
    prefixAESNumber = new ethereumjs.BN(prefixAES).toNumber();

    // Get message
    var messageBytes = aesjs.utils.utf8.toBytes(message);

    // Encrypt message
    var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(prefixAESNumber));
    var encryptedBytes = aesCtr.encrypt(messageBytes);

    var encryptedData = [];
    Array.prototype.push.apply(encryptedData, pointR.encode());
    Array.prototype.push.apply(encryptedData, prefixAES);
    Array.prototype.push.apply(encryptedData, encryptedBytes);
    return encryptedData;
  },

  decrypt: function(dataToDecrypt, privKey) {

    var ec = new elliptic.ec('secp256k1');

    // Get AES Key
    var rPoint = ec.curve.decodePoint(dataToDecrypt.slice(0,65));
    var Sx = rPoint.mul(privKey).x;
    var key = ethereumjs.Util.sha3(Sx);

    // Retrieve prefix for AES CTR mode
    var prefixAES = dataToDecrypt.slice(65,69);
    prefixAESNumber = new ethereumjs.BN(prefixAES).toNumber();

    // Get message to decrypt
    var messageBytes = dataToDecrypt.slice(69);

    // Decrypt message
    var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(prefixAESNumber));
    return aesCtr.decrypt(messageBytes);
  },

  removeInfoMsg: function(data) {
    var utf8ToArray = function(msg) {
      var arr = [];
      for (var i = 0; i < msg.length; i++) {
        arr.push(msg.charCodeAt(i));
      }
      return arr;
    };
    var infoBytes = utf8ToArray(App.INFO);
    for (var i = 1; i < infoBytes.length+1; i++) {
      if (infoBytes[-i] != data[-i]) {
        return data;
      }
    }
    return data.slice(0,-infoBytes.length);
  },

  showLoadError: function(errorMessage) {
    $('div.load-key-error-console').removeClass('hidden');
    $('div.load-key-error-console').html(
      'Error on loading key: ' + errorMessage
    );
  },

  addLoadConsoleMsg: function(msg) {
    $('div.load-key-console').removeClass('hidden');
    $('div.load-key-console').html(
      $('div.load-key-console').html() + msg + '<br />'
    );
  },

  showEncryptError: function(errorMessage) {
    $('div.encrypt-error-console').removeClass('hidden');
    $('div.encrypt-error-console').html(
      'Error on loading key: ' + errorMessage
    );
  },

  addEncryptConsoleMsg: function(msg) {
    $('div.encrypt-console').removeClass('hidden');
    $('div.encrypt-console').html(
      $('div.encrypt-console').html() + msg + '<br />'
    );
  },

  addSendInfoMsg: function(msg) {
    $('div.send-info').removeClass('hidden');
    $('div.send-info').html(
      $('div.send-info').html() + msg + '<br />'
    );
  },

  showSendError: function(errorMessage) {
    $('div.send-error-console').removeClass('hidden');
    $('div.send-error-console').html(
      errorMessage
    );
  },

  addSendConsoleMsg: function(msg) {
    $('div.send-console').removeClass('hidden');
    $('div.send-console').html(
      $('div.send-console').html() + msg + '<br />'
    );
  },

  showLoadTxError: function(errorMessage) {
    $('div.load-tx-error-console').removeClass('hidden');
    $('div.load-tx-error-console').html(
      errorMessage
    );
  },

  addLoadTxConsoleMsg: function(msg) {
    $('div.load-tx-console').removeClass('hidden');
    $('div.load-tx-console').html(
      $('div.load-tx-console').html() + msg + '<br />'
    );
  },

  showDecryptError: function(errorMessage) {
    $('div.decrypt-error-console').removeClass('hidden');
    $('div.decrypt-error-console').html(
      errorMessage
    );
  },

  addDecryptConsoleMsg: function(msg) {
    $('div.decrypt-console').removeClass('hidden');
    $('div.decrypt-console').html(
      $('div.decrypt-console').html() + msg + '<br />'
    );
  },

  getEtherScanBaseUrl: function() {
    if (App.web3NetworkId == 0) {
        return "https://etherscan.io/";
    } 
    return "https://ropsten.etherscan.io/";
  },

  checkIfAddressIsContract: function (address) {
    return new Promise((resolve, reject) => {
      web3.eth.getCode(address, function(e,r) {
        if (e) {
          reject(e);
        } else {
          resolve(r.length > 2);
        }
      })
    });
  },

  getEthTransactionFromBlockchain: function(txHash) {
    return new Promise((resolve, reject) => {
      web3.eth.getTransaction(txHash, (e,web3Tx) => {
        if (e) {
          reject(e);
        } else {
          var recipient = web3Tx.to;
          var txObject = {
            nonce: web3Tx.nonce,
            gasPrice: web3Tx.gasPrice.toNumber(),
            gasLimit: web3Tx.gas,
            from: web3Tx.from,
            to: recipient,
            value: web3Tx.value.toNumber(),
            data: web3Tx.input,
            v: web3Tx.v,
            r: web3Tx.r,
            s: web3Tx.s,
          };
          resolve(new ethereumjs.Tx(txObject));
        }
      });
    })
  },

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
