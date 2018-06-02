Api = {

    networkId: null,

    init: function(_networkId) {
        Api.networkId = _networkId;
    },

    getUrl: function() {
        if (Api.networkId == 1) {
            return "https://api.etherscan.io/api";
        } 
        return "https://ropsten.etherscan.io/api";
    },

    getCreationTransacionHash: function(contractAddress) {
        return new Promise((resolve, reject) => {
            $.getJSON({
            url: Api.getUrl() + '/',
            data: {'module': 'account', 'action': 'txlist', 
                    'address': contractAddress,
                    'startblock': '0', 'page': '1',
                    'offset': 1, 'sort': 'asc'},
            })
            .done((r) => {
                if (r.status == 1) {
                    if (r.result.length > 0) {
                        resolve(r.result[0].hash);
                    }
                    reject("No transactions found - that's weird!");
                };
                reject(r.result);
            })
            .fail((e) => {reject(e);});
        });
    },

    getOutTransactionHash: function(personalAddress) {
        return new Promise((resolve, reject) => {
            var _reject = reject;
            var _resolve = resolve;
            var getPage = (page, callback) => {
                $.getJSON({
                    url: Api.getUrl() + '/',
                    data: {'module': 'account', 'action': 'txlist', 
                            'address': personalAddress,
                            'startblock': '0', 'page': page,
                            'offset': 20, 'sort': 'asc'}
                    })
                    .done(callback)
                    .fail((e) => {_reject(e)});
            };

            var pageCallback = function(r) {
                if (r.status == 1) {
                    if (r.result.length > 0) {
                        for (var i = 0; i < r.result.length; i++) {
                            t = r.result[i];
                            if (t.to != "" && t.to.toLowerCase() != personalAddress.toLowerCase()) {
                                _resolve(t.hash);
                            }
                        }
                    }
                    currentPage += 1;
                    getPage(currentPage, pageCallback);
                } else {
                    _reject(r.message);
                }
            };

            var currentPage = 1;
            getPage(currentPage, pageCallback);
        });
    }
}