/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative, ReporterTestable } from "@utils/types";
import { ApplicationAssetUtils, FluxDispatcher, Forms } from "@webpack/common";

const Native = VencordNative.pluginHelpers.GensokyoRadioRichPresence as PluginNative<typeof import("./native")>;

interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

interface Activity {
    state: string;
    details?: string;
    timestamps?: {
        start?: number;
        end?: number;
    };
    assets?: ActivityAssets;
    buttons?: Array<string>;
    name: string;
    application_id: string;
    metadata?: {
        button_urls?: Array<string>;
    };
    type: number;
    flags: number;
}

const enum ActivityType {
    PLAYING = 0,
    LISTENING = 2,
}

const enum ActivityFlag {
    INSTANCE = 1 << 0
}

export interface TrackData {
    title: string;
    album: string;
    artist: string;

    artwork: string;

    position: number;
    duration: number;
}

const applicationId = "1253772057926303804";

function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "GensokyoRadio",
    });
}

function getImageAsset(data: string) {
    return ApplicationAssetUtils.fetchAssetIds(applicationId, [data]).then(ids => ids[0]);
}

const settings = definePluginSettings({
    refreshInterval: {
        type: OptionType.SLIDER,
        description: "The interval between activity refreshes (seconds)",
        markers: [1, 2, 2.5, 3, 5, 10, 15],
        default: 15,
        restartNeeded: true,
    }
});

export default definePlugin({
    name: "GensokyoRadioRichPresence",
    description: "Discord rich presence for Gensokyo Radio!",
    authors: [Devs.RyanCaoDev, Devs.Prince527 ?? { name: "Prince527", id: 364105797162237952n }],
    reporterTestable: ReporterTestable.None,

    settingsAboutComponent() {
        return <>
            <Forms.FormText>
                Discord rich presence for Gensokyo Radio!
            </Forms.FormText>
        </>;
    },

    settings,

    start() {
        this.updatePresence();
        this.updateInterval = setInterval(() => { this.updatePresence(); }, settings.store.refreshInterval * 1000);
    },

    stop() {
        clearInterval(this.updateInterval);
        FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity: null });
    },

    updatePresence() {
        this.getActivity().then(activity => { setActivity(activity); });
    },

    async getActivity(): Promise<Activity | null> {
        const trackData = await Native.fetchTrackData();
        if (!trackData) return null;

        return {
            application_id: applicationId,

            name: "Gensokyo Radio",
            details: trackData.title,
            state: trackData.artist,

            timestamps: {
                // start: Date.now() - (trackData.position * 1000),
                start: trackData.position * 1000,
                // end: Date.now() - (trackData.position * 1000) + (trackData.duration * 1000),
                end: trackData.duration * 1000,
            },

            assets: {
                large_image: await getImageAsset(trackData.artwork),
                large_text: trackData.album,
                small_image: await getImageAsset("logo"),
                small_text: "Gensokyo Radio"
            },

            buttons: undefined,
            metadata: { button_urls: undefined },

            type: ActivityType.LISTENING,
            flags: ActivityFlag.INSTANCE,
        };
    }
});
