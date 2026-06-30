// ==UserScript==
// @name         Afilia Button
// @version      1.1.9
// @author       AfiliaFrostfang
// @include      *://www.leitstellenspiel.de/*
// @grant        GM_addStyle
// ==/UserScript==
/* global $ */

(async function() {
    'use strict';

    /* ========= IndexedDB Helper ========= */

    const DB_NAME = "AfiliaDB";
    const DB_VERSION = 1;

    const db = await openDB();

    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = function(e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("keyvalue")) {
                    db.createObjectStore("keyvalue");
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function idbSet(key, value) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("keyvalue", "readwrite");
            const store = tx.objectStore("keyvalue");
            store.put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async function idbGet(key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("keyvalue", "readonly");
            const store = tx.objectStore("keyvalue");
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function compareVersions(v1, v2) {
        const a = v1.split('.').map(Number);
        const b = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(a.length, b.length); i++) {
            const x = a[i] || 0;
            const y = b[i] || 0;
            if (x < y) return -1;
            if (x > y) return 1;
        }
        return 0;
    }

    async function fetchVersionData() {
        try {
            const response = await fetch('https://afiliafrostfang.github.io/AfiliaButton/version.json');
            return await response.json();
        } catch (e) {
            console.error("Version fetch error:", e);
            return null;
        }
    }

    async function setTimeoutPreference(timeout) {
        await idbSet("AfiliaTimeout", timeout);
    }

    async function getTimeoutPreference() {
        return await idbGet("AfiliaTimeout") || 0;
    }

    async function setMissionListPreference(isActive) {
        await idbSet("AfiliaMissionListActive", isActive);
    }

    async function getMissionListPreference() {
        return await idbGet("AfiliaMissionListActive") ?? false;
    }

    async function saveState() {
        await idbSet("AfiliaState", {
            config,
            vehicles: aVehicleTypes,
            missions: aMissions,
            allianceMissions,
            missionListActive: await getMissionListPreference()
        });
    }

    async function loadState() {
        const state = await idbGet("AfiliaState");
        if (state) {
            config = state.config;
            aVehicleTypes = state.vehicles;
            aMissions = state.missions;
            allianceMissions = state.allianceMissions;
            await setMissionListPreference(state.missionListActive);
        }
    }

    /* ========= Version Check ========= */

    const versionData = await fetchVersionData();

    if (
        versionData &&
        versionData.version &&
        compareVersions(versionData.version, GM.info.script.version) > 0
    ) {
        const confirmation = confirm(
            `Eine neue Version (${versionData.version}) ist verfügbar. Update öffnen?`
        );

        if (confirmation) {
            window.location.href = versionData.updateURL1;
        }
    }

    /* ========= Load State ========= */

    await loadState();

    let stopInProgress = false;

    $("body").on("click", "#AfiliaStop", function() {
        stopInProgress = true;
    });

    /* ========= Fetch Data ========= */

    if (!sessionStorage.aVehicleTypesNew) {
        try {
            const res = await fetch("https://afiliafrostfang.github.io/AfiliaButton/vehicletype.json");
            const data = await res.json();
            sessionStorage.aVehicleTypesNew = JSON.stringify({
                lastUpdate: Date.now(),
                value: data
            });
        } catch (e) {
            console.error(e);
        }
    }

    if (!sessionStorage.aMissions) {
        try {
            const res = await fetch("https://www.leitstellenspiel.de/einsaetze.json");
            const data = await res.json();
            sessionStorage.aMissions = JSON.stringify({
                lastUpdate: Date.now(),
                value: data
            });
        } catch (e) {
            console.error(e);
        }
    }

    var aVehicleTypes = JSON.parse(sessionStorage.aVehicleTypesNew).value;
    var aMissions = JSON.parse(sessionStorage.aMissions).value;
    var config = await idbGet("AfiliaConfig") || {
        credits: 0,
        vehicles: [],
        missionListActive: true
    };

    var allianceMissions = [];

    /* ========= Styles ========= */

    GM_addStyle(`
.modal {
display:none;
position:fixed;
padding-top:100px;
left:0;right:0;top:0;bottom:0;
background:rgba(0,0,0,0.4);
z-index:9999;
}
.modal-body{height:650px;overflow-y:auto;}
`);

    /* ========= Modal ========= */

    $("body").prepend(`
<div class="modal fade" id="AfiliaModal">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">

      <div class="modal-header">
        <button class="close" data-dismiss="modal">❌</button>

        <h5 class="modal-title">
          <center>April April der macht wassa will.</center>
        </h5>

        <div class="btn-group">
          <a class="btn btn-success btn-xs" id="AfiliaScan">Scan</a>
          <a class="btn btn-success btn-xs" id="AfiliaStart">Start</a>
          <a class="btn btn-danger btn-xs" id="AfiliaStop">Stop</a>
          <a class="btn btn-success btn-xs" id="AfiliaPreferences">⚙️</a>
        </div>
      </div>

      <div class="modal-body" id="AfiliaModalBody"></div>

      <div class="modal-footer">
        <button class="btn btn-danger" id="close">Schließen</button>
        <div class="pull-left" id="AfiliaVersion">
          v ${GM_info.script.version}
        </div>
      </div>

    </div>
  </div>
</div>
`);

    /* ========= Version click handler (URL2) ========= */

    $("body").on("click", "#AfiliaVersion", function () {
        if (versionData && versionData.updateURL2) {
            window.location.href = versionData.updateURL2;
        }
    });

    /* ========= Button injection ========= */

    $("#search_input_field_missions").before(`
        <a id="chilloutArea" data-toggle="modal" data-target="#AfiliaModal"
           class="btn btn-danger btn-xs">
           <span class="glyphicon glyphicon-queen"></span>Einsatzbereit
        </a>
    `);

    /* ========= Scan / Table / Alarm logic ========= */

    function scanMissions() {
        allianceMissions.length = 0;

        $("#mission_list_alliance .missionSideBarEntry:not(.mission_deleted)").each(function() {
            const id = +this.id.replace(/\D+/g, "");
            const type = +$(this).attr("mission_type_id");

            if (!$("#mission_participant_new_" + id).hasClass("hidden")) {
                const info = aMissions.find(m => m.id == type);
                const credits = info?.average_credits > 0 ? info.average_credits : 50000;

                allianceMissions.push({
                    id,
                    typeId: type,
                    credits,
                    name: $("#mission_caption_" + id).text().trim(),
                    address: $("#mission_address_" + id).text().trim()
                });
            }
        });

        if (allianceMissions.length >= 2) {
            allianceMissions.sort((a, b) => b.credits - a.credits);
        }
    }

    function writeTable() {
        let sum = 0;

        allianceMissions = allianceMissions.filter(e =>
            e.credits >= config.minCredits &&
            e.credits <= config.maxCredits
        );

        let html = `<table class="table"><thead>
<tr><th>Name</th><th>Adresse</th><th>Credits</th><th>Status</th></tr>
</thead><tbody>`;

        for (const e of allianceMissions) {
            sum += e.credits;

            html += `
<tr id="tr_${e.id}">
<td><a href="/missions/${e.id}">${e.name}</a></td>
<td>${e.address}</td>
<td>${e.credits}</td>
<td id="status_${e.id}"></td>
</tr>`;
        }

        html += `<tr><td colspan="2">Summe</td><td>${sum}</td><td></td></tr></tbody></table>`;
        $("#AfiliaModalBody").html(html);
    }

    async function alertVehicles() {
        const timeout = await getTimeoutPreference();

        for (const m of allianceMissions) {
            if (stopInProgress) {
                stopInProgress = false;
                return;
            }

            await new Promise(r => setTimeout(r, timeout));

            $("#status_" + m.id).text("suche ...");

            const html = await $.get("/missions/" + m.id);
            const mission = $(html);

            const checkboxes = mission.find(".vehicle_checkbox");

            if (!checkboxes.length) {
                $("#status_" + m.id).text("keine Fahrzeuge");
                continue;
            }

            for (const box of checkboxes) {
                const typeId = +box.attributes.vehicle_type_id.value;
                const vid = +box.value;

                if (config.vehicles.includes(typeId)) {
                    $("#status_" + m.id).text("alarmiere ...");

                    await $.post(`/missions/${m.id}/alarm`, {
                        vehicle_ids: vid
                    });

                    $("#tr_" + m.id).remove();
                    break;
                }
            }
        }
    }

    function mapVehicles(arr, mode) {
        let out = [];

        if (mode === "type") {
            arr.forEach(name => {
                const v = aVehicleTypes.find(x => x.short_name === name);
                if (v) out.push(v.id);
            });
        } else {
            arr.forEach(id => {
                const v = aVehicleTypes.find(x => x.id === id);
                if (v) out.push(v.short_name);
            });
        }

        return out;
    }

    /* ========= UI Events ========= */

    $("body").on("click", "#AfiliaScan", async () => {
        scanMissions();
        writeTable();
    });

    $("body").on("click", "#AfiliaStart", alertVehicles);

    $("body").on("click", "#AfiliaPreferences", async function() {
        const timeout = await getTimeoutPreference();

        $("#AfiliaModalBody").html(`
Timeout: <input id="AfiliaTimeout" value="${timeout}">
<button id="AfiliaBtnSave">Save</button>
        `);
    });

    $("body").on("click", "#AfiliaBtnSave", async function() {
        await idbSet("AfiliaConfig", config);
        setTimeoutPreference($("#AfiliaTimeout").val());
        $("#AfiliaModalBody").html("<h3>Saved</h3>");
    });

    $("body").on("click", "#close", async function() {
        await saveState();
    });

})();