/**
 * AvalonTypes.ts - Types for avalon rule
 */

import {
    ViewPropsInterface
} from '../../common/interfaces';

export enum AvalonGameState {
    ChooseQuestMembers,
    VoteQuestMembers,
    VoteQuest,
    ChooseMerlin,
    GameOver
}

export enum AvalonGameOutcome {
    MinionWin,
    ArthurWin,
    MerlinFound
}

export enum AvalonCharacter {
    LoyalServant,
    Minion,
    Merlin,
    Percival,
    Mondred,
    Morgana
}

export enum AvalonQuestStatus {
    TeamApproved,
    TeamRejected,
    QuestFailed,
    QuestSucceeded
}

export interface AvalonQuest {
    quest: number,
    leader: number,
    teamMembers: string[],
    teamVote: any,
    questVote: any,
    questStatus: AvalonQuestStatus
}

export interface AvalonCharactersInPlay {
    merlin: boolean,
    percival: boolean,
    mondred: boolean,
    morgana: boolean
}

export interface AvalonViewPropsInterface extends ViewPropsInterface {
    lobby: any;

    status: string;
    leader: number;
    requiredMembers: number;
    currentQuest: number;
    currentTeam: string[],
    voteType: string,
    character: AvalonCharacter,
    minions: number[],
    merlins: number[],
    quests: AvalonQuest[],
    notification: boolean,
    chooseMerlin: boolean
    charactersInPlay: AvalonCharactersInPlay,
    cardsInPlay: any
}
