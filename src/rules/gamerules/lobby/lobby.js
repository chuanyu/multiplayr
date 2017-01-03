var Lobby = {};

Lobby.name = 'lobby';
Lobby.css = ['lobby.css'];

Lobby.globalData = {
    started: {
        value: false,
        const: false
    }
};

Lobby.playerData = {
    // Players' names
    name: {
        value: 'player',
        const: false
    }
};

Lobby.methods = {
    setName: function(playerId, name) {
        var gameObj = this;
        gameObj.setPlayerData(playerId, 'name', name);
    },
    disconnectClient: function(senderId, toDisconnectId) {
        var gameObj = this;
        if (senderId === gameObj.clientId) {
            gameObj.removeClient(toDisconnectId);
        }
    }
}

Lobby.onDataChange = function() {
    with(this) {
        var names = getPlayersData('name');
        var connected = getPlayersData('__isConnected');
        var orderedNames = [];
        var clientIds = [];
        var playersConnection = [];

        playersForEach(function(client, i) {
            clientIds.push(client);
            orderedNames.push(names[i]);
            playersConnection.push(connected[i]);
        });

        playersForEach(function(client, ind) {
            setViewProps(client, 'clientId', client);
            setViewProps(client, 'name', names[ind]);
            setViewProps(client, 'playerNum', ind);
            setViewProps(client, 'playerCount', playersCount());
            setViewProps(client, 'names', orderedNames);
        });

        setViewProps(clientId, 'clientIds', clientIds);
        setViewProps(clientId, 'names', orderedNames);
        setViewProps(clientId, 'playerCount', playersCount());
        setViewProps(clientId, 'playersConnection', playersConnection);

        return false;
    };
};

Lobby.views = {
    Lobby: React.createClass({
        displayName: 'Lobby',
        startGame: function() {
            var gameObj = this.props.MP;
            gameObj.parent.startGame();
        },
        render: function() {
            function createHello(names) {
                var tr = [];

                for (var i=0;i<names.length;++i) {
                    tr.push( Lobby.views.HelloMessage({name: names[i]}) );
                }

                if (names.length === 0) {
                    tr.push( React.DOM.div({className: 'waiting'},
                                           'Waiting for players to join'));
                }

                return tr;
            }
            return React.DOM.div(
                null,
                React.DOM.div({id: 'lobby-playerlist'}, createHello(this.props.names)),
                React.DOM.button({onClick: this.startGame}, 'Start game')
            );
        }
    }),
    HelloMessage: React.createClass({
        displayName: 'HelloMessage',
        render: function() {
            return React.DOM.div(null,
                                 "Hello",
                                 React.DOM.span({className: 'lobby-name'},
                                                this.props.name));
        }
    }),
    SetName: React.createClass({
        displayName: 'SetName',
        getInitialState: function() {
            return {name: this.props.name};
        },
        onChange: function(e) {
            this.state.name = e.target.value;
            this.props.MP.setName(e.target.value);
            return true;
        },
        render: function() {
            return React.DOM.div(
                {id: 'setname-container'},
                React.DOM.div({id: 'setname-header'}, 'Name'),
                React.DOM.input( {id: 'setname-input', value: this.state.name, onChange: this.onChange } )
            );
        }
    }),

    //
    // Views to allow host to manage players in the room
    //
    "host-roommanagement": React.createClass({
        render: function() {

            return React.DOM.table(
                {id: 'lobby-roommanagement'},
                Lobby.views['host-roommanagement-header'](),
                Lobby.views['host-roommanagement-body'](this.props)
            );
        }
    }),

    "host-roommanagement-header": React.createClass({
        render: function() {
            return React.DOM.tr(
                null,
                React.DOM.th(null, ' '),
                React.DOM.th(null, 'Client-Id'),
                React.DOM.th(null, 'Name'),
                React.DOM.th(null, ' ')
            );
        }
    }),

    "host-roommanagement-body": React.createClass({
        render: function() {
            var self = this;
            var tr = [];
            for (var i=0; i<this.props.names.length; ++i) {
                tr.push(Lobby.views['host-roommanagement-body-row']({
                    MP: this.props.MP,
                    clientId: this.props.clientIds[i],
                    name: this.props.names[i],
                    isConnected: this.props.playersConnection[i]
                }));
            }
            return React.DOM.tbody(null,
                                   tr);
        }
    }),

    "host-roommanagement-body-row": React.createClass({
        disconnect: function() {
            this.props.MP.disconnectClient(this.props.clientId);
            return true;
        },
        render: function() {
            return React.DOM.tr(
                null,
                React.DOM.td(null,
                             React.DOM.div({
                                 className: this.props.isConnected ? 'lobby-connected' : 'lobby-disconnected'
                             }, '')),
                React.DOM.td(null, this.props.clientId),
                React.DOM.td(null, this.props.name),
                React.DOM.td(null,
                             React.DOM.button({
                                 onClick: this.disconnect
                             }, 'Disconnect'))

            );
        }
    })
};
