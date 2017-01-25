/**
 * Coup.tsx - Rule for Coup game
 */

import * as React from 'react';
import * as FontAwesome from 'react-fontawesome';
import * as colorsys from 'colorsys';

import Lobby from '../lobby/lobby';
import Shell from '../gameshell/gameshell';

import {
    ChoiceList,
    Choice
} from '../../client/components/ChoiceList';

import {
    GameRuleInterface,
    MPType,
    ViewPropsInterface
} from '../../common/interfaces';

import {
    shuffle,
    forEach
} from '../../common/utils';

enum CoupGameState {
    PlayAction = 1,       // A player chooses an action.
    PlayReaction,         // Other players react to the action chooses - challenge / block etc.
    ChallengeResult,      // Shows the result of a challenge, and interface for loser to pick losing card.
    AmbassadorCardChange, // Ambassador action - player choose cards to swap.
    GameOver              // Game over screen.
};

enum CoupAction {
    Duke = 1,    // Take 3 coins from the treasury
    Assassin,    // Pay three coins and try to assassinate another player's character
    Captain,     // Take two coins from another player
    Ambassador,  // Draw two character cards, and choose
    Income,      // Take one coin from the treasury
    ForeignAid,  // Take two coins from the treasury
    Coup         // Spend 7 coins and assassinate an opponent
};

enum CoupReaction {
    Challenge = 1,
    Block
};

enum CoupCard {
    Duke = 1,
    Assassin,
    Contessa,
    Captain,
    Ambassador,
    Unknown
};

enum CoupCardState {
    Active = 1,
    ChallengeFailed,
    Assassinated,
    Couped
};

enum CoupWaitContext {
    PlayAction = 1,
    ChallengeOrBlock,
    ChallengeFail
};

interface CoupActionInterface {
    action: CoupAction,
    clientId: string,
    targetId?: string,
    challenge?: string,
    block?: string,
    challengeResult?: boolean
    challengeLoser?: string,
    challengeWinner?: string,
    challengeCauseDead?: boolean
};

/**
 * Generate a new deck of cards - 3 of Duke, Assassin, Contessa, Captain, Ambassador.
 */
function newDeck() {
    const deck: CoupCard[] = [];

    for (let i = 0; i < 3; i = i + 1) {
        deck.push(CoupCard.Duke);
        deck.push(CoupCard.Assassin);
        deck.push(CoupCard.Contessa);
        deck.push(CoupCard.Captain);
        deck.push(CoupCard.Ambassador);
    }

    shuffle(deck);

    return deck;
}

/**
 * Move state to the next player's turn
 */
function nextTurn(
    mp: MPType
) {
    let currentPlayerTurn = mp.getData('playerTurn');
    const initPlayerTurn = currentPlayerTurn;
    const playersCount = mp.playersCount();
    let nextPlayerTurn = null;
    let firstNotDead = null;
    let meetInit = false;

    mp.playersForEach(
        (clientId, index) => {
            const isDead = mp.getPlayerData(clientId, 'isDead');
            if (isDead) {
                return;
            }

            if (index === initPlayerTurn) {
                meetInit = true;
                return;
            }

            if (!meetInit && !isDead && firstNotDead === null) {
                firstNotDead = index;
            }

            if (meetInit && !isDead && nextPlayerTurn === null) {
                nextPlayerTurn = index;
            }
        });

    if (nextPlayerTurn === null && firstNotDead !== null) {
        nextPlayerTurn = firstNotDead;
    }

    if (nextPlayerTurn !== null) {
        mp.setData('gameState', CoupGameState.PlayAction);
        mp.setData('playerTurn', nextPlayerTurn);
    } else {
        mp.setData('gameState', CoupGameState.GameOver);
    }
}

function addActions(
    mp: MPType,
    action: CoupActionInterface,
    actionsEl: any[],
    index: number = 0
) {
    const playerTag = mp.getPluginView(
        'lobby',
        'player-tag',
        {
            clientId: action.clientId
        }
    );

    switch (action.action) {
        case CoupAction.Income:
            actionsEl.push(
                <li className='coup-actionslist-item Income'
                    key={ 'action-' + index }>
                    { playerTag } played <strong>Income</strong>, +1 gold
                </li>
            );
            break;

        case CoupAction.Duke:
            actionsEl.push(
                <li className='coup-actionslist-item Duke'
                    key={ 'action-' + index }>
                    { playerTag } played <strong>Duke</strong>, +3 gold
                </li>
            );
            break;

        case CoupAction.Assassin:
            actionsEl.push(
                <li className='coup-actionslist-item Assassin'
                    key={ 'action-' + index }>
                    { playerTag } played <strong>Assassin</strong>
                </li>
            );
            break;

        case CoupAction.Captain:
            actionsEl.push(
                <li className='coup-actionslist-item Captain'
                    key={ 'action-' + index }>
                    { playerTag } played <strong>Captain</strong>
                </li>
            );
            break;

        case CoupAction.Ambassador:
            actionsEl.push(
                <li className='coup-actionslist-item Ambassador'
                    key={ 'action-' + index }>
                    { playerTag } played <strong>Ambassador</strong>
                </li>
            );
            break;

        case CoupAction.Ambassador:
            actionsEl.push(
                <li className='coup-actionslist-item ForeignAid'
                    key={ 'action-' + index }>
                    { playerTag } played <strong>ForeignAid</strong>
                </li>
            );
            break;

        case CoupAction.Coup:
            actionsEl.push(
                <li className='coup-actionslist-item Coup'
                    key={ 'action-' + index }>
                    { playerTag } played <strong>Coup</strong>
                </li>
            );
            break;
    }

    let blockPlayerTag = null;

    if (action.block) {
        blockPlayerTag = mp.getPluginView(
            'lobby',
            'player-tag',
            {
                clientId: action.block
            }
        );
        actionsEl.push(
            <li className='coup-actionslist-item Block'
                key={ 'action-block-' + index }>
                { blockPlayerTag } blocked the attempt.
            </li>
        );
    }

    if (action.challenge) {
        const challengePlayerTag = mp.getPluginView(
            'lobby',
            'player-tag',
            {
                clientId: action.challenge
            }
        );
        const challengeLoserTag = mp.getPluginView(
            'lobby',
            'player-tag',
            {
                clientId: action.challengeLoser
            }
        );

        let blockOrAction = 'action';
        if (action.block) {
            blockOrAction = 'block';
        }
        let challengeResult = 'failed';
        if (action.challengeResult) {
            challengeResult = 'succeeded';
        }

        actionsEl.push(
            <li className='coup-actionslist-item Challenge'
                key={ 'action-challenge-' + index }>
                { challengePlayerTag } challenged the { blockOrAction }, and <strong>{ challengeResult }!</strong>
            </li>);

        actionsEl.push(
            <li className='coup-actionslist-item ChallengeLoseCard'
                key={ 'action-challenge-lose-' + index }>
                { challengeLoserTag } loses one character card.
            </li>
        );

        if (action.challengeCauseDead) {
            actionsEl.push(
                <li className='coup-actionslist-item ChallengeDead'
                    key={ 'action-challenge-dead-' + index }>
                    { challengeLoserTag } has no more character cards, and is out of the game!
                </li>
            );
        }
    }
}

function replaceChallengedCard(
    mp: MPType,
    clientId: string,
    card: CoupCard
) {
    const cards = mp.getPlayerData(clientId, 'cards');
    const deck = mp.getData('deck');
    let found = false;
    let i = 0;

    for (i = 0; i < cards.length; i = i + 1) {

        if (cards[i].state === CoupCardState.Active &&
            cards[i].card === card) {

            alert(i + ' ' + cards[i].card + ' ' + card);

            found = true;
            deck.push(card);

            break;
        }
    }

    if (!found) {
        throw(new Error('Challenge should have failed - player does not have card ' + card));
    }

    shuffle(deck);

    const draw = deck.splice(0, 1);
    cards[i].card = draw[0];

    mp.setData('deck', deck);
    mp.setPlayerData(clientId, 'cards', cards);
}

/**
 * Checks if a players hand has a given card.
 */
function hasCard(
    cards: any[],
    card: CoupCard
) {
    for (let i = 0; i < cards.length; i = i + 1) {
        if (cards[i].card === card &&
            cards[i].state === CoupCardState.Active) {

            return true;
        }
    }

    return false;
}

/**
 * Checks if a challenge failure causes player to lose, and update data accordingly.
 */
function challengeFailCauseDead(
    mp: MPType,
    clientId: string
) {
    const cards = mp.getPlayerData(clientId, 'cards');
    let activeCards = 0;
    for (let i = 0; i < cards.length; i = i + 1) {
        if (cards[i].state === CoupCardState.Active) {
            activeCards = activeCards + 1;
        }
    }

    if (activeCards > 1) {
        return false;
    }

    for (let i = 0; i < cards.length; i = i + 1) {
        cards[i].state = CoupCardState.ChallengeFailed;
    }

    mp.setPlayerData(clientId, 'cards', cards);
    mp.setPlayerData(clientId, 'isDead', true);

    return true;
}

/**
 * Checks if a challenge succeded, return true if challenger wins, and false otherwise.
 */
function checkChallenge(
    mp: MPType,
    lastAction: CoupActionInterface
) {
    const { action, challenge, clientId } = lastAction;
    const cards = mp.getPlayerData(clientId, 'cards');

    switch (action) {
        case CoupAction.Duke:
            return !hasCard(cards, CoupCard.Duke);
        case CoupAction.Assassin:
            return !hasCard(cards, CoupCard.Assassin);
        case CoupAction.Captain:
            return !hasCard(cards, CoupCard.Captain);
        case CoupAction.Ambassador:
            return !hasCard(cards, CoupCard.Ambassador);
        default:
            throw(new Error('Action ' + CoupAction[action] + ' cannot be challenged.'));
    }
}

export const CoupRule: GameRuleInterface = {

    name: 'coup',
    css: ['coup.css'],

    plugins: {
        'lobby': Lobby,
        'gameshell': Shell
    },

    globalData: {
        gameState: CoupGameState.PlayAction,
        playerTurn: -1,
        lastAction: {
            player: -1,
            action: CoupAction.Duke,
            challenge: -1,
            block: -1,
        },
        actions: [],
        deck: []
    },

    playerData: {
        coins: 0,
        cards: [],
        isDead: false
    },

    onDataChange: (mp: MPType) => {
        const started = mp.getData('lobby_started');

        const showLobby = () => {
            mp.setView(mp.clientId, 'host-lobby');

            mp.playersForEach((clientId) => {
                mp.setView(clientId, 'lobby_SetName');
            });

            return true;
        }

        if (!started) {
            return showLobby();
        }

        //
        // Push props down to clients
        //

        const playersData = mp.getPlayersData(['coins', 'cards']);
        const playerTurn = mp.getData('playerTurn');
        let playerTurnId = null;
        const actions = mp.getData('actions');
        const alivePlayers = [];

        mp.setViewProps(mp.hostId, 'actions', actions);
        mp.setViewProps(mp.hostId, 'playerTurn', playerTurn);

        mp.playersForEach((clientId, index) => {
            if (index === playerTurn) {
                playerTurnId = clientId;
            }
            if (!mp.getPlayerData(clientId, 'isDead')) {
                alivePlayers.push(clientId);
            }
        });

        mp.setViewProps(mp.hostId, 'playerTurnId', playerTurnId);

        mp.playersForEach(
            (clientId, index) => {
                mp.setViewProps(clientId, 'coins', playersData[index].coins);
                mp.setViewProps(clientId, 'cards', playersData[index].cards);
                mp.setViewProps(clientId, 'actions', actions);
                mp.setViewProps(clientId, 'playerTurn', playerTurn);
                mp.setViewProps(clientId, 'playerTurnId', playerTurnId);
                mp.setViewProps(clientId, 'alivePlayers', alivePlayers);

                const playersCards = {};
                mp.playersForEach(
                    (otherClientId, otherIndex) => {
                        if (index === otherIndex) {
                            return;
                        }

                        playersCards[otherClientId] = [];

                        for (let i = 0; i < 2; i = i + 1) {
                            if (playersData[otherIndex].cards[i].state === CoupCardState.Active) {
                                playersCards[otherClientId].push({
                                    card: CoupCard.Unknown,
                                    state: CoupCardState.Active
                                });
                            } else {
                                playersCards[otherClientId].push(playersData[otherIndex].cards[i]);
                            }
                        }
                    });

                mp.setViewProps(clientId, 'playersCards', playersCards);
            });

        //
        // Render views based on game state.
        //

        switch (mp.getData('gameState')) {

            case CoupGameState.PlayAction:

                mp.setView(mp.hostId, 'host-playaction');
                mp.playersForEach((clientId, index) => {
                    if (index === playerTurn) {
                        mp.setView(clientId, 'client-playaction');
                    } else {
                        mp.setViewProps(clientId, 'waitForId', playerTurnId);
                        mp.setViewProps(clientId, 'waitContext', CoupWaitContext.PlayAction);
                        mp.setView(clientId, 'client-waitforaction');
                    }
                });

                break;

            case CoupGameState.PlayReaction:
                mp.setView(mp.hostId, 'host-playaction');
                mp.playersForEach((clientId, index) => {
                    if (index === playerTurn) {
                        mp.setViewProps(clientId, 'waitContext', CoupWaitContext.ChallengeOrBlock);
                        mp.setView(clientId, 'client-waitforaction');
                    } else {
                        mp.setView(clientId, 'client-playreaction');
                    }
                });

                break;

            case CoupGameState.ChallengeResult:
                const lastAction = actions[actions.length - 1];
                const challengeLoser = lastAction.challengeLoser;
                const challengeWinner = lastAction.challengeWinner;

                mp.setView(mp.hostId, 'host-playaction');
                mp.playersForEach((clientId, index) => {
                    if (clientId === challengeLoser) {
                        mp.setView(clientId, 'client-chooseloseinfluence');
                    } else if (clientId === challengeWinner) {
                        mp.setViewProps(clientId, 'waitForId', challengeLoser);
                        mp.setViewProps(clientId, 'waitAdditionalText', 'Your challenged card has been replaced! ');
                        mp.setViewProps(clientId, 'waitContext', CoupWaitContext.ChallengeFail);
                        mp.setView(clientId, 'client-waitforaction');
                    } else {
                        mp.setViewProps(clientId, 'waitForId', challengeLoser);
                        mp.setViewProps(clientId, 'waitContext', CoupWaitContext.ChallengeFail);
                        mp.setView(clientId, 'client-waitforaction');
                    }
                });
                break;

            case CoupGameState.AmbassadorCardChange:
                break;

            case CoupGameState.GameOver:
                break;
        }

        return true;
    },

    methods: {
        'startGame': (mp: MPType) => {
            if (mp.playersCount() < 1) {
                alert('We need at least 1 players to play this game');
            } else {
                mp.newGame();
                mp.setData('lobby_started', true);
            }
        },

        'newGame': (mp: MPType) => {
            const deck = newDeck();
            mp.setData('deck', deck);
            mp.setData('actions', []);
            mp.distributeCards();

            mp.playersForEach((clientId) => {
                mp.setPlayerData(clientId, 'coins', 2);
                mp.setPlayerData(clientId, 'isDead', false);
            });

            mp.setData('playerTurn', Math.floor(Math.random() * mp.playersCount()));
            mp.setData('gameState', CoupGameState.PlayAction);
        },

        'distributeCards': (mp: MPType) => {
            // Distribute 2 cards to each player.
            const deck = mp.getData('deck');

            mp.playersForEach((clientId) => {
                const draw = deck.splice(0, 2);
                const cards = [];

                [0, 1].forEach((i) => {
                    cards.push({
                        card: draw[i],
                        state: CoupCardState.Active
                    });
                });

                mp.setPlayerData(clientId, 'cards', cards);
            });

            mp.setData('deck', deck);
        },

        'takeAction': (
            mp: MPType,
            clientId: string,
            action: CoupAction,
            targetId?: string
        ) => {
            //
            // Verify validity of action.
            //
            if (mp.getData('gameState') !== CoupGameState.PlayAction) {
                throw(new Error('Action can only be taken in PlayAction state'));
            }

            const turn = mp.getData('playerTurn');
            mp.playersForEach(
                (cId, index) => {
                    if (index === turn && clientId !== cId) {
                        throw(new Error('Action can only be on the player\'s turn'));
                    }
                });

            if (action === CoupAction.Assassin ||
                action === CoupAction.Captain ||
                action === CoupAction.Coup) {

                if (!targetId) {
                    throw(new Error('TargetId not set for an action that requires it'));
                }
            } else {
                targetId = null;
            }

            if (targetId && mp.getPlayerData(targetId, 'isDead') === true) {
                throw(new Error('Cannot target a dead player'));
            }

            const coins = mp.getPlayerData(clientId, 'coins');
            if (coins >= 10 && action !== CoupAction.Coup) {
                throw(new Error('Coup action must be taken if player has more than 10 coins'));
            }

            if ((action === CoupAction.Coup && coins < 7) ||
                (action === CoupAction.Assassin && coins < 3)) {
                throw(new Error('Insufficient coins to perform action.'));
            }

            const actions = mp.getData('actions');
            const actionObj: CoupActionInterface = {
                action: action,
                clientId: clientId,
                targetId: targetId,
                challenge: null,
                block: null
            };

            actions.push(actionObj);
            mp.setData('actions', actions);

            if (action === CoupAction.Income) {
                // Income action cannot be disputed, continue.
                mp.setPlayerData(clientId, 'coins', coins + 1);
                nextTurn(mp);
            } else if (action === CoupAction.Coup) {
                // Coup cannot be disputed, continue.
            } else {
                mp.setData('gameState', CoupGameState.PlayReaction);
            }
        },

        'takeReaction': (
            mp: MPType,
            clientId: string,
            reaction: CoupReaction
        ) => {
            //
            // Verify validity of action.
            //
            if (mp.getData('gameState') !== CoupGameState.PlayReaction) {
                throw(new Error('Reaction can only be taken in PlayReaction state'));
            }

            const actions = mp.getData('actions');
            const lastAction = actions[actions.length - 1];
            const { action, challenge, block, targetId } = lastAction;

            if (reaction === CoupReaction.Challenge && challenge) {
                throw(new Error('Challenge has already been performed by client:' + challenge));
            }

            if (reaction === CoupReaction.Block && challenge || block) {
                throw(new Error('Block cannot be performend, already challenged/block'));
            }

            if (reaction === CoupReaction.Block) {
                if (action !== CoupAction.ForeignAid && targetId !== clientId) {
                    throw(new Error('Block reaction not allowed'));
                }
            }

            if (reaction === CoupReaction.Challenge && block) {
                //
                // Resolve challenge to block.
                //
            } else if (reaction === CoupReaction.Challenge) {
                //
                // Resolve challenge to action.
                //

                lastAction.challenge = clientId;
                lastAction.challengeResult = checkChallenge(mp, lastAction);

                if (lastAction.challengeResult) {
                    lastAction.challengeLoser = lastAction.clientId;
                } else {
                    lastAction.challengeLoser = lastAction.challenge;
                    lastAction.challengeWinner = lastAction.clientId;

                    replaceChallengedCard(mp, lastAction.challengeWinner, CoupCard[CoupAction[lastAction.action]]);
                }

                if (challengeFailCauseDead(mp, lastAction.challengeLoser)) {
                    lastAction.challengeCauseDead = true;
                    nextTurn(mp);
                } else {
                    mp.setData('gameState', CoupGameState.ChallengeResult);
                }

            } else if (reaction === CoupReaction.Block) {
                //
                // Allow other players to contest block action.
                //

                lastAction.block = clientId;
                mp.setData('gameState', CoupGameState.PlayReaction);
            }

            mp.setData('actions', actions);
        },

        'revealCard': (
            mp: MPType,
            clientId: string,
            card: string
        ) => {
            if (mp.getData('gameState') !== CoupGameState.ChallengeResult) {
                throw(new Error('revealCard can only be taken in ChallengeResult state'));
            }

            const actions = mp.getData('actions');
            const lastAction = actions[actions.length - 1];
            const { action, challenge, block, targetId } = lastAction;
            const cards = mp.getPlayerData(clientId, 'cards');
            const cardNum = parseInt(card, 10);

            if (lastAction.challengeLoser !== clientId) {
                throw(new Error('Only challengeLoser can perform revealCard'));
            }

            if (!(cardNum >= 0 && cardNum < cards.length)) {
                throw(new Error('revealCard invalid card'));
            }

            cards[cardNum].state = CoupCardState.ChallengeFailed;
            mp.setPlayerData(clientId, 'cards', cards);

            nextTurn(mp);
        }
    },

    views: {
        'host-lobby': class extends React.Component<ViewPropsInterface, {}> {
            public render() {
                const mp = this.props.MP;
                return mp.getPluginView(
                    'gameshell',
                    'HostShell-Main',
                    {
                        'links': {
                            'home': {
                                'icon': 'home',
                                'label': 'Home',
                                'view': mp.getPluginView('lobby', 'Lobby')
                            },
                            'clients': {
                                'icon': 'users',
                                'label': 'Players',
                                'view': mp.getPluginView('lobby', 'host-roommanagement')
                            }
                        }
                    });
            }
        },

        'actions-page': class extends React.Component<ViewPropsInterface & { actions: CoupActionInterface[] }, {}> {
            public render() {
                const actions = this.props.actions;
                const actionsEl = [];

                for (let i = actions.length - 1; i >= 0; i = i - 1) {
                    addActions(this.props.MP, actions[i], actionsEl, i);
                }

                return (
                    <ul className='coup-actionslist'>
                        { actionsEl }
                    </ul>
                );
            }
        },

        /**
         * Last Action (common) - show last action.
         */
        'last-action': class extends React.Component<ViewPropsInterface & {
            actions: CoupActionInterface[]
        }, {}> {
            public render() {
                const actions = this.props.actions;

                if (actions.length === 0) {
                    return null;
                } else {
                    const action = actions[actions.length - 1];
                    const actionsEl = [];

                    addActions(this.props.MP, action, actionsEl);

                    return (
                        <ul className='coup-actionslist coup-lastaction'>
                            { actionsEl }
                        </ul>
                    );
                }
            }
        },

        /**
         * Players Cards (client) - shows player cards.
         */
        'players-cards': class extends React.Component<ViewPropsInterface & {
            cards: any[],
            playersCards: any[],
            lobby: any
        }, {}> {
            public render() {
                const mp = this.props.MP;
                const playersCards = this.props.playersCards;

                let i = 0;
                for (i = 0; i < this.props.lobby.clientIds.length; i = i + 1) {
                    if (this.props.MP.clientId === this.props.lobby.clientIds[i]) {
                        break;
                    }
                }

                const myCard = React.createElement(
                    CoupRule.views['player-card'],
                    {
                        clientId: this.props.MP.clientId,
                        cards: this.props.cards,
                        MP: this.props.MP,
                        accent: this.props.lobby.accents[i]
                    });

                const separator = (<div className='coup-seperator'>&nbsp;</div>);

                const playersCardsEl = [];

                forEach(
                    playersCards,
                    (clientId, cards) => {
                        let i = 0;
                        for (i = 0; i < this.props.lobby.clientIds.length; i = i + 1) {
                            if (clientId === this.props.lobby.clientIds[i]) {
                                break;
                            }
                        }

                        playersCardsEl.push(
                            React.createElement(
                                CoupRule.views['player-card'],
                                {
                                    clientId: clientId,
                                    cards: cards,
                                    MP: this.props.MP,
                                    accent: this.props.lobby.accents[i],
                                    key: 'player-card-' + clientId
                                }));
                    });

                return (
                    <div className='coup-players-cards'>
                        { myCard }
                        { separator }
                        { playersCardsEl }
                    </div>
                );
            }
        },

        'player-card': class extends React.Component<ViewPropsInterface & {
            clientId: string,
            cards: any[],
            accent: string
        }, {}> {
            public render() {
                const cards = this.props.cards;
                const accentHsv = colorsys.hex_to_hsv(this.props.accent);
                const accent = this.props.accent;
                /* const accent = colorsys.hsv_to_hex({
                 *     h: accentHsv.h,
                 *     s: accentHsv.s / 1.5,
                 *     v: accentHsv.v
                 * });*/
                const accentLight = colorsys.hsv_to_hex({
                    h: accentHsv.h,
                    s: accentHsv.s / 4,
                    v: 100
                });

                const cardsEl = [];
                const playerTag =  this.props.MP.getPluginView(
                    'lobby',
                    'player-tag',
                    {
                        clientId: this.props.clientId,
                        size: 'medium',
                        invertColors: true,
                        className: 'coup-player-cards-tag'
                    }
                );

                for (let i = 0; i < cards.length; i = i + 1) {
                    const cardName = CoupCard[cards[i].card];
                    cardsEl.push(
                        React.createElement(
                            CoupRule.views['card'],
                            {
                                card: cards[i],
                                accent: accentLight,
                                key: 'card' + i
                            }));
                }

                return (
                    <div className='coup-player-cards'
                         key={ 'player-cards-' + this.props.clientId }>
                        { playerTag }
                        <div />
                        <div className='coup-player-cards-container'
                             style={{ borderColor: accent,
                                      backgroundColor: accent }}>
                            { cardsEl }
                        </div>
                    </div>
                );
            }
        },

        'card': class extends React.Component<{
            card: any,
            accent: string
        }, {}> {
            public render() {
                const card = this.props.card;
                const cardName = CoupCard[card.card];

                return (
                    <div className={ 'coup-card ' + cardName }>
                        <footer style={{ backgroundColor: this.props.accent }}>
                            { cardName }
                        </footer>
                    </div>
                );
            }
        },

        'client-coins': class extends React.Component<ViewPropsInterface & { coins: Number }, {}> {
            public render() {
                const mp = this.props.MP;
                return (
                    <div className='coup-client-coin'>
                        <FontAwesome name='usd' />
                        &nbsp;
                        { this.props.coins }
                    </div>
                );
            }
        },

        /**
         * PlayAction (Host) views
         */
        'host-playaction': class extends React.Component<ViewPropsInterface, {}> {
            public render() {
                const mp = this.props.MP;
                const playActionPage = React.createElement(CoupRule.views['host-playaction-page'],
                                                           this.props);
                return mp.getPluginView(
                    'gameshell',
                    'HostShell-Main',
                    {
                        'links': {
                            'home': {
                                'icon': 'home',
                                'label': 'Home',
                                'view': playActionPage
                            },
                            'clients': {
                                'icon': 'users',
                                'label': 'Players',
                                'view': mp.getPluginView('lobby', 'host-roommanagement')
                            },
                        }
                    });
            }
        },

        'host-playaction-page': class extends React.Component<ViewPropsInterface, {}> {
            public render() {
                return <div>hello</div>
            }
        },

        /**
         * Wait for action page (client).
         */
        'client-waitforaction': class extends React.Component<ViewPropsInterface, {}> {
            public render() {
                const mp = this.props.MP;
                const waitActionPage = React.createElement(CoupRule.views['client-waitforaction-page'], this.props);
                const cards = React.createElement(CoupRule.views['players-cards'], this.props);
                const coins = React.createElement(CoupRule.views['client-coins'], this.props);
                const actionsPage = React.createElement(CoupRule.views['actions-page'], this.props);

                return mp.getPluginView(
                    'gameshell',
                    'HostShell-Main',
                    {
                        'links': {
                            'home': {
                                'icon': 'gamepad',
                                'label': 'Coup',
                                'view': waitActionPage
                            },
                            'cards': {
                                'icon': 'address-card',
                                'label': 'Card',
                                'view': cards
                            },
                            'actionslist': {
                                'icon': 'list',
                                'label': 'Actions History',
                                'view': actionsPage
                            }
                        },
                        'topBarContent': coins
                    });
            }
        },

        'client-waitforaction-page': class extends React.Component<ViewPropsInterface & {
            waitForId?: string,
            waitAdditionalText?: string
            waitContext: CoupWaitContext
        }, {}> {
            public render() {
                const mp = this.props.MP;
                const lastAction = React.createElement(CoupRule.views['last-action'], this.props);

                if (this.props.waitContext === CoupWaitContext.ChallengeOrBlock) {
                    return (
                        <div>
                            { lastAction }
                            { this.props.waitAdditionalText }
                            Waiting for other players to challenge or block.
                        </div>
                    );
                } else {
                    const player = this.props.MP.getPluginView(
                        'lobby',
                        'player-tag',
                        {
                            clientId: this.props.waitForId,
                            invertColors: true
                        }
                    );

                    let waitingAction = null;
                    if (this.props.waitContext === CoupWaitContext.PlayAction) {
                        waitingAction = (<span>make a move</span>);
                    } else {
                        waitingAction = (<span>pick a character card to reveal</span>);
                    }

                    return (
                        <div>
                            { lastAction }
                            { this.props.waitAdditionalText }
                            Waiting for { player } to { waitingAction }.
                        </div>
                    );
                }
            }
        },

        /**
         * PlayAction (Client) views
         */
        'client-playaction': class extends React.Component<ViewPropsInterface, {}> {
            public render() {
                const mp = this.props.MP;
                const playActionPage = React.createElement(CoupRule.views['client-playaction-page'], this.props);
                const cardsPage = React.createElement(CoupRule.views['players-cards'], this.props);
                const actionsPage = React.createElement(CoupRule.views['actions-page'], this.props);
                const coins = React.createElement(CoupRule.views['client-coins'], this.props);

                return mp.getPluginView(
                    'gameshell',
                    'HostShell-Main',
                    {
                        'links': {
                            'home': {
                                'icon': 'gamepad',
                                'label': 'Coup',
                                'view': playActionPage
                            },
                            'cards': {
                                'icon': 'address-card',
                                'label': 'Card',
                                'view': cardsPage
                            },
                            'actionslist': {
                                'icon': 'list',
                                'label': 'Actions History',
                                'view': actionsPage
                            }
                        },
                        'topBarContent': coins
                    });
            }
        },

        'client-playaction-page': class extends React.Component<ViewPropsInterface, {}> {
            public render() {
                const lastAction = React.createElement(CoupRule.views['last-action'], this.props);
                const selectAction = React.createElement(CoupRule.views['client-playaction-page-selectaction'], this.props);

                return (
                    <div className='coup-client-playaction'>
                        { lastAction }
                        <header>Select your action</header>
                        { selectAction }
                    </div>
                );
            }
        },

        'client-playaction-page-selectaction': class extends React.Component<ViewPropsInterface & {
            cards: any[],
            coins: number,
            alivePlayers: string[]
        }, {
            action: CoupAction,
            player: string
        }> {
            constructor(props: ViewPropsInterface) {
                super(props);
                this.state = {
                    action: null,
                    player: null
                };
                this._selectAction = this._selectAction.bind(this);
                this._selectPlayer = this._selectPlayer.bind(this);
            }

            private _selectAction(choice: string, index: Number) {
                this.setState({
                    action: CoupAction[choice],
                    player: this.state.player
                });
                return true;
            }

            private _selectPlayer(choice: string, index: Number) {
                this.setState({
                    action: this.state.action,
                    player: choice
                });
                return true;
            }

            public render() {
                const mp = this.props.MP;
                const { cards, coins, alivePlayers } = this.props;
                const choices = [];
                const playerChoices = [];

                for (let i = 0; i < alivePlayers.length; i = i + 1) {
                    if (alivePlayers[i] === this.props.MP.clientId) {
                        continue;
                    }

                    const player = this.props.MP.getPluginView(
                        'lobby',
                        'player-tag',
                        {
                            clientId: alivePlayers[i],
                            invertColors: false
                        }
                    );

                    playerChoices.push(
                        <Choice key={ alivePlayers[i] }>
                            { player }
                        </Choice>
                    );
                }
                let playerChoicesStyle = { display: 'none' };
                let disabled = true;

                if (this.state.action) {
                    disabled = false;
                }

                if (this.state.action === CoupAction.Assassin ||
                    this.state.action === CoupAction.Captain ||
                    this.state.action === CoupAction.Coup) {
                    playerChoicesStyle = { display: 'block' };
                    if (!this.state.player) {
                        disabled = true;
                    }
                }

                if (coins >= 7) {
                    choices.push(
                        <Choice key={ CoupAction[CoupAction.Coup] }>
                            Coup - Spend 7 coins and assassinate an opponent
                        </Choice>
                    );
                }

                if (coins < 10) {
                    choices.push(
                        <Choice key={ CoupAction[CoupAction.Income] }>
                            Income - Take 1 coin from the treasury
                        </Choice>
                    );
                }

                if (coins < 10) {
                    choices.push(
                        <Choice key={ CoupAction[CoupAction.ForeignAid] }>
                            ForeignAid - Take 2 coins from the treasury
                        </Choice>
                    );
                }

                if (coins < 10) {
                    choices.push(
                        <Choice key={ CoupAction[CoupAction.Duke] }
                                className={ hasCard(cards, CoupCard.Duke) ? '' : 'coup-action-choicelist-lie'}>
                            Duke - Take 3 coins from the treasury
                        </Choice>
                    );
                }

                if (coins >= 3 && coins < 10) {
                    choices.push(
                        <Choice key={ CoupAction[CoupAction.Assassin] }
                                className={ hasCard(cards, CoupCard.Assassin) ? '' : 'coup-action-choicelist-lie'}>
                            Assassin - Spend 3 coins to assassinate another player
                        </Choice>
                    );
                }

                if (coins < 10) {
                    choices.push(
                        <Choice key={ CoupAction[CoupAction.Captain] }
                                className={ hasCard(cards, CoupCard.Captain) ? '' : 'coup-action-choicelist-lie'}>
                            Captain - Steal 2 coins from another player
                        </Choice>
                    );
                }

                if (coins < 10) {
                    choices.push(
                        <Choice key={ CoupAction[CoupAction.Ambassador] }
                                className={ hasCard(cards, CoupCard.Ambassador) ? '' : 'coup-action-choicelist-lie'}>
                            Ambassador - Draw 2 character cards and choose any to replace
                        </Choice>
                    );
                }

                const button = (
                    <button className='coup-action-choicelist-button'
                            disabled={ disabled }
                            onClick={ this.props.MP.takeAction.bind(this, this.state.action, this.state.player) }>
                        Take Action!
                    </button>
                );

                return (
                    <div>
                        <ChoiceList onSelect={ this._selectAction }
                                    selectedKey={ CoupAction[this.state.action] }
                                    className='coup-action-choicelist'
                                    itemClassName='coup-action-choicelist-item'>
                            { choices }
                        </ChoiceList>
                        <ChoiceList onSelect={ this._selectPlayer }
                                    selectedKey={ this.state.player }
                                    className='coup-action-choicelist'
                                    itemClassName='coup-action-choicelist-item'
                                    style={ playerChoicesStyle }>
                            { playerChoices }
                        </ChoiceList>
                        { button }
                    </div>
                );
            }
        },

        /**
         * PlayReaction (Client) views
         */
        'client-playreaction': class extends React.Component<ViewPropsInterface, {}> {
            public render() {
                const mp = this.props.MP;
                const playReactionPage = React.createElement(CoupRule.views['client-playreaction-page'], this.props);
                const cardsPage = React.createElement(CoupRule.views['players-cards'], this.props);
                const actionsPage = React.createElement(CoupRule.views['actions-page'], this.props);
                const coins = React.createElement(CoupRule.views['client-coins'], this.props);

                return mp.getPluginView(
                    'gameshell',
                    'HostShell-Main',
                    {
                        'links': {
                            'home': {
                                'icon': 'gamepad',
                                'label': 'Coup',
                                'view': playReactionPage
                            },
                            'cards': {
                                'icon': 'address-card',
                                'label': 'Card',
                                'view': cardsPage
                            },
                            'actionslist': {
                                'icon': 'list',
                                'label': 'Actions History',
                                'view': actionsPage
                            }
                        },
                        'topBarContent': coins
                    });
            }
        },

        'client-playreaction-page': class extends React.Component<ViewPropsInterface & {
            actions: any
        }, {
            reaction: CoupReaction
        }> {
            constructor(props: ViewPropsInterface) {
                super(props);
                this.state = { reaction: null };
                this._selectReaction = this._selectReaction.bind(this);
            }

            private _selectReaction(choice: string, index: Number) {
                this.setState({ reaction: CoupReaction[choice] });
                return true;
            }

            public render() {
                const actions = this.props.actions;
                const lastAction = React.createElement(CoupRule.views['last-action'], this.props);
                const { action, block, challenge, targetId } = actions[actions.length - 1];
                const choices = [];


                if (action === CoupAction.ForeignAid && !block) {
                    choices.push(
                        <Choice key={ CoupReaction[CoupReaction.Block] }>
                            Block
                        </Choice>
                    );
                } else {

                    if (!challenge) {
                        choices.push(
                            <Choice key={ CoupReaction[CoupReaction.Challenge] }>
                                Challenge
                            </Choice>
                        );
                    }

                    if (targetId === this.props.MP.clientId &&
                        !challenge &&
                        !block) {

                        choices.push(
                            <Choice key={ CoupReaction[CoupReaction.Block] }>
                                Block
                            </Choice>
                        );
                    }
                }

                const button = (
                    <button className='coup-action-choicelist-button'
                            style={ this.state.reaction ? { display: 'block' } : { display: 'none' } }
                            onClick={ this.props.MP.takeReaction.bind(this, this.state.reaction, null) }>
                        Confirm { CoupReaction[this.state.reaction] } Reaction!
                    </button>
                );

                return (
                    <div>
                        { lastAction }
                        <header>Select your reaction</header>
                        <ChoiceList onSelect={ this._selectReaction }
                                    selectedKey={ CoupReaction[this.state.reaction] }>
                            { choices }
                        </ChoiceList>
                        { button }
                    </div>
                );
            }
        },

        /**
         * Choose lose influence (Client) views - when player fails a challenge, view to choose card
         * to discard.
         */
        'client-chooseloseinfluence': class extends React.Component<ViewPropsInterface, {}> {
            public render() {
                const mp = this.props.MP;
                const chooseLoseInfluencePage = React.createElement(CoupRule.views['client-chooseloseinfluence-page'], this.props);
                const cardsPage = React.createElement(CoupRule.views['players-cards'], this.props);
                const actionsPage = React.createElement(CoupRule.views['actions-page'], this.props);
                const coins = React.createElement(CoupRule.views['client-coins'], this.props);

                return mp.getPluginView(
                    'gameshell',
                    'HostShell-Main',
                    {
                        'links': {
                            'home': {
                                'icon': 'gamepad',
                                'label': 'Coup',
                                'view': chooseLoseInfluencePage
                            },
                            'cards': {
                                'icon': 'address-card',
                                'label': 'Card',
                                'view': cardsPage
                            },
                            'actionslist': {
                                'icon': 'list',
                                'label': 'Actions History',
                                'view': actionsPage
                            }
                        },
                        'topBarContent': coins
                    });
            }
        },

        'client-chooseloseinfluence-page': class extends React.Component<ViewPropsInterface & {
            cards: any[],
            lobby: any
        }, {
            card: string
        }> {
            constructor(props: ViewPropsInterface) {
                super(props);
                this.state = { card: null };
                this._selectCard = this._selectCard.bind(this);
            }

            private _selectCard(choice: string, index: Number) {
                this.setState({ card: choice });
                return true;
            }

            public render() {
                const mp = this.props.MP;
                const lastAction = React.createElement(CoupRule.views['last-action'], this.props);
                const cards = this.props.cards;
                const choices = [];

                for (let i = 0; i < cards.length; i = i + 1) {
                    const card = React.createElement(
                        CoupRule.views['card'],
                        {
                            card: cards[i],
                            accent: this.props.lobby.accent
                        });

                    choices.push(
                        <Choice key={ i }>
                            { card }
                        </Choice>
                    );
                }

                const button = (
                    <button className='coup-action-choicelist-button'
                            disabled={ this.state.card === null ? true : false }
                            onClick={ this.props.MP.revealCard.bind(this, this.state.card, null) }>
                        Reveal this card
                    </button>
                );

                return (
                    <div className='coup-chooseloseinfluence'>
                        { lastAction }
                        <ChoiceList onSelect={ this._selectCard }
                                    selectedKey={ CoupAction[this.state.card] }
                                    className='coup-card-choicelist'
                                    itemClassName='coup-card-choicelist-item'>
                            { choices }
                        </ChoiceList>
                        { button }
                    </div>
                );
            }
        }
    }
};

export default CoupRule;