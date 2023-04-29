import React, { useEffect, createRef } from "react";
import { utils } from '../Utils/Utils';
import { Persona, PersonaSize } from 'office-ui-fabric-react';
import { Icon } from '@fluentui/react/lib/Icon';
import {
    isUnknownIdentifier,
    isPhoneNumberIdentifier,
} from '@azure/communication-common';
import { Features } from '@azure/communication-calling';
import { ParticipantMenuOptions } from './ParticipantMenuOptions';

export default class RemoteParticipantCard extends React.Component {
    constructor(props) {
        super(props);
        this.call = props.call;
        this.remoteParticipant = props.remoteParticipant;
        this.identifier = this.remoteParticipant.identifier;
        this.id = utils.getIdentifierText(this.remoteParticipant.identifier);

        this.spotlightFeature = this.call.feature(Features.Spotlight);
        this.raiseHandFeature = this.call.feature(Features.RaiseHand);
        this.menuOptionsHandler= props.menuOptionsHandler;
        this.state = {
            isSpeaking: this.remoteParticipant.isSpeaking,
            state: this.remoteParticipant.state,
            isMuted: this.remoteParticipant.isMuted,
            displayName: this.remoteParticipant.displayName?.trim(),
            isHandRaised: utils.isParticipantHandRaised(this.remoteParticipant.identifier, this.raiseHandFeature.getRaisedHands()),
            isSpotlighted: utils.isParticipantHandRaised(this.remoteParticipant.identifier, this.spotlightFeature.getSpotlightedParticipants()),
        };
    }

    componentWillUnmount() {
        this.remoteParticipant.off('isMutedChanged', () => {});
        this.remoteParticipant.off('stateChanged', () => {});
        this.remoteParticipant.off('isSpeakingChanged', () => {});
        this.remoteParticipant.off('displayNameChanged', () => {});
        this.spotlightFeature.off('spotlightChanged', ()=>{});
        this.raiseHandFeature.off("loweredHandEvent", ()=>{});
        this.raiseHandFeature.off("raisedHandEvent", ()=>{});
    }

    componentDidMount() {
        this.remoteParticipant.on('isMutedChanged', () => {
            this.setState({ isMuted: this.remoteParticipant.isMuted });
                if (this.remoteParticipant.isMuted) {
                    this.setState({ isSpeaking: false });
                }
        });

        this.remoteParticipant.on('stateChanged', () => {
            this.setState({ state: this.remoteParticipant.state });
        });

        this.remoteParticipant.on('isSpeakingChanged', () => {
            this.setState({ isSpeaking: this.remoteParticipant.isSpeaking });
        })

        this.remoteParticipant.on('displayNameChanged', () => {
            this.setState({ displayName: this.remoteParticipant.displayName?.trim() });
        });

        this.spotlightFeature.on("spotlightChanged", () => {
            this.setState({isSpotlighted: utils.isParticipantSpotlighted(
                this.remoteParticipant.identifier, 
                this.spotlightFeature.getSpotlightedParticipants())});
        });

        const isRaiseHandChangedHandler = (event) => {
            this.setState({isHandRaised: utils.isParticipantHandRaised(
                this.remoteParticipant.identifier,
                this.raiseHandFeature.getRaisedHands())})
        }
        this.raiseHandFeature.on("loweredHandEvent", isRaiseHandChangedHandler);
        this.raiseHandFeature.on("raisedHandEvent", isRaiseHandChangedHandler);
    }

    handleRemoveParticipant(e, identifier) {
        e.preventDefault();
        this.call.removeParticipant(identifier).catch((e) => console.error(e))
    }

    async handleRemoteRaiseHand() {
        try {
            if (this.state.isHandRaised) {
                await this.raiseHandFeature.lowerHand([this.remoteParticipant.identifier]);
                this.setState({isHandRaised: utils.isParticipantHandRaised(this.remoteParticipant.identifier, this.raiseHandFeature.getRaisedHands())})
            }
        } catch(error) {
            console.error(error)
        }
    }

    async admitParticipant() {
        await this.call.admit(this.identifier);
    }

    async rejectParticipant() {
        await this.call.rejectParticipant(this.identifier);
    }

    render() {
        return (
            <li className={this.state.isSpotlighted ? 'participant-item spotlightEnabled':'participant-item'} key={utils.getIdentifierText(this.remoteParticipant.identifier)}>
                <div className="ms-Grid-row">
                    <div className="ms-Grid-col ms-lg10 ms-sm10">
                        <Persona className={this.state.isSpeaking ? `speaking-border-for-initials` : ``}
                            size={PersonaSize.size40}
                            text={ this.state.displayName ? this.state.displayName : utils.getIdentifierText(this.remoteParticipant.identifier) }
                            secondaryText={this.state.state}
                            styles={{ primaryText: {color: '#edebe9'}, secondaryText: {color: '#edebe9'} }}/>
                    </div>
                    <div className="ms-Grid-col ms-lg2 ms-sm2">
                        <ParticipantMenuOptions
                            id={this.remoteParticipant.identifier}
                            menuOptionsHandler={this.menuOptionsHandler}
                            menuOptionsState={{isSpotlighted: this.state.isSpotlighted}} />
                    </div>
                </div>
                <div className="ms-Grid-row">
                    <div className="ms-Grid-col ms-lg1 ms-sm2">
                        {
                            <span className="in-call-button"
                                title={`${this.state.isMuted ?'Participant is muted': ``}`}
                            >
                                {<Icon 
                                    iconName={this.state.isMuted ? "MicOff2" : "Microphone"}
                                />}
                            </span>
                        }
                    </div>
                    {
                        !(isPhoneNumberIdentifier(this.remoteParticipant.identifier) || isUnknownIdentifier(this.remoteParticipant.identifier)) &&
                        <div>
                            <div className="ms-Grid-col ms-lg1 ms-sm2">
                                <span className="in-call-button"
                                    title={this.state.isHandRaised ? "Lower Participant Hand":``}
                                    variant="secondary"
                                    onClick={() => this.handleRemoteRaiseHand()}>
                                    {
                                        <Icon iconName="HandsFree" className={this.state.isHandRaised ? "callFeatureEnabled" : ``}/>
                                    }
                                </span>
                            </div>
                        </div>
                    }
                </div>
                {
                    this.state.state === "InLobby" ?
                        <div className="text-right lobby-action">
                            <a href="#" onClick={e => this.admitParticipant(e)} className="float-right ml-3"> Admit Participant</a>
                            <a href="#" onClick={e => this.rejectParticipant(e)} className="float-right ml-3"> Reject Participant</a>
                        </div> :
                        <div className="text-right">
                            <a href="#" onClick={e => this.handleRemoveParticipant(e, this.remoteParticipant.identifier)} className="participant-remove float-right ml-3">Remove participant</a>
                        </div>
                }
            </li>
        )
    }
}



