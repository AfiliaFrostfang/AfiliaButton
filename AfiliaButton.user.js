// ==UserScript==
// @name         Yuhi Button
// @version      1.1.9
// @author       YuhiAmatsume
// @include      *://www.leitstellenspiel.de/*
// @grant        GM_addStyle
// ==/UserScript==
/* global $ */

(async function() {
    'use strict';
    
    
    /* ========= IndexedDB Helper ========= */

    const DB_NAME = "YuhiDB";
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
    
    // Function to compare version numbers
    function compareVersions(v1, v2) {
        const versionParts1 = v1.split('.').map(Number);
        const versionParts2 = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(versionParts1.length, versionParts2.length); i++) {
            const part1 = versionParts1[i] || 0;
            const part2 = versionParts2[i] || 0;

            if (part1 < part2) {
                return -1;
            } else if (part1 > part2) {
                return 1;
            }
        }

        return 0;
    }

    // Fetch version from JSON file using fetch
    async function fetchVersionData() {
        try {
            const response = await fetch('https://afiliafrostfang.github.io/YuhiButton/version.json');
            return await response.json();
        } catch (error) {
            console.error('Error fetching version data:', error);
            return null;
        }
    }

    async function setTimeoutPreference(timeout) {
        await idbSet("YuhiTimeout", timeout);
    }

    async function getTimeoutPreference() {
        return await idbGet("YuhiTimeout") || 0;
    }

    async function setMissionListPreference(isActive) {
        await idbSet("YuhiMissionListActive", isActive);
    }

    async function getMissionListPreference() {
        return await idbGet("YuhiMissionListActive") ?? false;
    }

    // Save Modal State
    async function saveState() {
        await idbSet("YuhiState", {
            config: config,
            vehicles: aVehicleTypes,
            missions: aMissions,
            allianceMissions: allianceMissions,
            missionListActive: await getMissionListPreference()
        });
    }
    // Load Modal State
    async function loadState() {
        const parsedState = await idbGet("YuhiState");
        if (parsedState) {
            config = parsedState.config;
            aVehicleTypes = parsedState.vehicles;
            aMissions = parsedState.missions;
            allianceMissions = parsedState.allianceMissions;
            await setMissionListPreference(parsedState.missionListActive);
        }
    }
    // Get the version data
    const versionData = await fetchVersionData();

    // Compare versions and redirect if a higher version is detected
    if (versionData && versionData.version && compareVersions(versionData.version, GM.info.script.version) > 0) {
        const confirmation = confirm(`Eine neue Version von Yuhi Button, Version: (${versionData.version}) ist verfügbar. Willst du die Update URL öffnen?`);
        if (confirmation) {
            window.location.href = versionData.updateURL1;
            setTimeout(() => {
                window.location.href = versionData.updateURL2;
            }, 1000);
        }
    }

    //Load Saved State
    await loadState();

    let stopInProgress = false;

    $("body").on("click", "#YuhiStop", function() {
        stopInProgress = true;
    });

    if(!sessionStorage.aVehicleTypesNew || JSON.parse(sessionStorage.aVehicleTypesNew).lastUpdate < (new Date().getTime() - 4 * 500 * 60)) {
        try {
            // Change from $.getJSON to fetch API
            const response = await fetch("https://afiliafrostfang.github.io/YuhiButton/vehicletype.json");
            const data = await response.json();
            sessionStorage.setItem('aVehicleTypesNew', JSON.stringify({lastUpdate: new Date().getTime(), value: data}));
        } catch (error) {
            console.error('Error fetching vehicle types:', error);
        }
    }

    if(!sessionStorage.aMissions || JSON.parse(sessionStorage.aMissions).lastUpdate < (new Date().getTime() - 4 * 500 * 60)) {
        try {
            // Change from $.getJSON to fetch API
            const response = await fetch('https://www.leitstellenspiel.de/einsaetze.json');
            const data = await response.json();
            sessionStorage.setItem('aMissions', JSON.stringify({lastUpdate: new Date().getTime(), value: data}));
        } catch (error) {
            console.error('Error fetching missions:', error);
        }
    }

    var aVehicleTypes = JSON.parse(sessionStorage.aVehicleTypesNew).value;
    var aMissions = JSON.parse(sessionStorage.aMissions).value;
    var config = await idbGet("YuhiConfig") || {"credits": 0, "vehicles": [], "missionListActive": true};
    var allianceMissions = [];

    GM_addStyle(`.modal {
display: none;
position: fixed; /* Stay in place front is invalid - may break your css so removed */
padding-top: 100px;
left: 0;
right:0;
top: 0;
bottom: 0;
overflow: auto;
background-color: rgb(0,0,0);
background-color: rgba(0,0,0,0.4);
z-index: 9999;
}
.modal-body{
height: 650px;
overflow-y: auto;
}`);

    $("body")
        .prepend(`<div class="modal fade bd-example-modal-lg" id="YuhiModal" tabindex="-1" role="dialog" aria-labelledby="myLargeModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg" role="document">
                      <div class="modal-content">
                        <div class="modal-header">
                          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&#x274C;</span>
                          </button>
                          <h5 class="modal-title"><center>April April der macht wassa will.</center></h5>
                          <div class="btn-group">
                            <a class="btn btn-success btn-xs" id="YuhiScan">Scan</a>
                            <a class="btn btn-success btn-xs" id="YuhiStart">Start</a>
                            <a class="btn btn-danger btn-xs" id="YuhiStop">Stop</a>
                            <a class="btn btn-success btn-xs" id="YuhiPreferences">
                              <div class="glyphicon glyphicon-cog" style="color:LightSteelBlue"></div>
                            </a>
                          </div>
                        </div>
                          <div class="modal-body" id="YuhiModalBody">
                          </div>
                          <div class="modal-footer">
                            <button type="button" class="btn btn-danger" id="close" data-dismiss="modal">Schließen</button>
                            <div class="pull-left">v ${GM_info.script.version}</div>
                          </div>
                    </div>
                  </div>`);

    $("#search_input_field_missions")
        .before(`<a id="chilloutArea" data-toggle="modal" data-target="#YuhiModal" class="btn btn-danger btn-xs">
                   <span class="glyphicon glyphicon-queen"></span>Einsatzbereit</a>`);

    function scanMissions() {

        allianceMissions.length = 0;

        $("#mission_list_alliance .missionSideBarEntry:not(.mission_deleted)").each(function() {
            var $this = $(this);
            var missionId = +$this.attr("id").replace(/\D+/g, "");
            if (!$("#mission_participant_new_" + missionId).hasClass("hidden")) {
                var missionInfos = aMissions.filter((obj) => obj.id == +$this.attr("mission_type_id"))[0];
                var missionCredits = missionInfos ? (missionInfos.average_credits > 0 ? missionInfos.average_credits : 0) : 5E+4;
                allianceMissions.push({ "id": missionId, "typeId": +$this.attr("mission_type_id"), "credits": missionCredits, "name": $("#mission_caption_" + missionId).contents().not($("#mission_caption_" + missionId).children()).text().replace(",", "").trim(), "address": $("#mission_address_" + missionId).text().trim() });
            }
        });

        $("#mission_list_alliance_event .missionSideBarEntry:not(.mission_deleted)").each(function() {
            var $this = $(this);
            var missionId = +$this.attr("id").replace(/\D+/g, "");
            if (!$("#mission_participant_new_" + missionId).hasClass("hidden")) {
                var missionInfos = aMissions.filter((obj) => obj.id == +$this.attr("mission_type_id"))[0];
                var missionCredits = missionInfos ? (missionInfos.average_credits > 0 ? missionInfos.average_credits : 0) : 5E+4;
                allianceMissions.push({ "id": missionId, "typeId": +$this.attr("mission_type_id"), "credits": missionCredits, "name": $("#mission_caption_" + missionId).contents().not($("#mission_caption_" + missionId).children()).text().replace(",", "").trim(), "address": $("#mission_address_" + missionId).text().trim() });
            }
        });
        
        if (config.missionListActive) {
            $("#mission_list  > .missionSideBarEntry:not(.mission_deleted)").each(function() {
                var $this = $(this);
                var missionId = +$this.attr("id").replace(/\D+/g,"");
                if(!$("#mission_participant_new_"+missionId).hasClass("hidden")) {
                    var missionInfos = aMissions.filter((obj) => obj.id == +$this.attr("mission_type_id"))[0];
                    var missionCredits = missionInfos ? (missionInfos.average_credits > 0 ? missionInfos.average_credits : 0) : 5E+4;
                    allianceMissions.push({ "id": missionId, "typeId": +$this.attr("mission_type_id"), "credits": missionCredits, "name": $("#mission_caption_" + missionId).contents().not($("#mission_caption_" + missionId).children()).text().replace(",", "").trim(), "address": $("#mission_address_" + missionId).text().trim() });
                }
            });
        }

        $("#mission_list_sicherheitswache .missionSideBarEntry:not(.mission_deleted)").each(function() {
            var $this = $(this);
            var missionId = +$this.attr("id").replace(/\D+/g, "");
            if (!$("#mission_participant_new_" + missionId).hasClass("hidden")) {
                var missionInfos = aMissions.filter((obj) => obj.id == +$this.attr("mission_type_id"))[0];
                var missionCredits = missionInfos ? (missionInfos.average_credits > 0 ? missionInfos.average_credits : 0) : 5E+4;
                allianceMissions.push({ "id": missionId, "typeId": +$this.attr("mission_type_id"), "credits": missionCredits, "name": $("#mission_caption_" + missionId).contents().not($("#mission_caption_" + missionId).children()).text().replace(",", "").trim(), "address": $("#mission_address_" + missionId).text().trim() });
            }
        });

        $("#mission_list_sicherheitswache_alliance .missionSideBarEntry:not(.mission_deleted)").each(function() {
            var $this = $(this);
            var missionId = +$this.attr("id").replace(/\D+/g, "");
            if (!$("#mission_participant_new_"+missionId).hasClass("hidden")) {
                var missionInfos = aMissions.filter((obj) => obj.id == +$this.attr("mission_type_id"))[0];
                var missionCredits = missionInfos ? (missionInfos.average_credits > 0 ? missionInfos.average_credits : 0) : 5E+4;
                allianceMissions.push({ "id": missionId, "typeId": +$this.attr("mission_type_id"), "credits": missionCredits, "name": $("#mission_caption_" + missionId).contents().not($("#mission_caption_" + missionId).children()).text().replace(",", "").trim(), "address": $("#mission_address_" + missionId).text().trim() });
            }
        })

        if(allianceMissions.length >= 2) allianceMissions.sort((a, b) => a.credits > b.credits ? -1 : 1);
    }

    function writeTable() {
        var sumCredits = 0; // Initialisiere Creditzähler und setze ihn auf 0
        allianceMissions = allianceMissions.filter(e => e.credits >= config.minCredits && e.credits <= config.maxCredits);

        var intoTable =
            `<table class="table">
             <thead>
             <tr>
             <th class="col">Name</th>
             <th class="col">Adresse</th>
             <th class="col-1">Credits</th>
             <th class="col-1">Status</th>
             </tr>
             </thead>
             <tbody>`;

        for(var i in allianceMissions) {
            var e = allianceMissions[i];

            if(e.credits < config.credits) {
                delete allianceMissions[i];
                continue;
            }

            sumCredits += e.credits; //Credits zur Summe hinzufügen

            intoTable +=
                `<tr id="tr_${e.id}" class="alert alert-info">
                   <td class="col">
                     <a class="lightbox-open" href="/missions/${e.id}">${e.name.replace("[Verband]", "<span class='glyphicon glyphicon-asterisk'></span>").replace("[Event]", "<span class='glyphicon glyphicon-star'></span>")}</a>
                   </td>
                   <td class="col">${e.address}</td>
                   <td class="col-1">${e.credits.toLocaleString()}</td>
                   <td class="col-1" id="status_${e.id}"></td>
                 </tr>`;
        }

        intoTable += 
            `<tr>
               <td colspan="2" class="col">Durchschnittlicher Gesamtertrag:</td>
               <td class="col-1">${sumCredits.toLocaleString()}</td>
               <td class="col-1"></td>
            </tr>
            </tbody>
            </table>`;

        $("#YuhiModalBody").html(intoTable);
    }

async function alertVehicles() {
    var foundVehicles = [];

    const timeout = await getTimeoutPreference();

    for (var i in allianceMissions) {
        if (stopInProgress) {
            stopInProgress = false;
            return;
        }

        await new Promise(resolve => setTimeout(resolve, timeout));

        var mId = allianceMissions[i].id;
        $("#status_" + mId).text("suche ...");

        var missionHtml = await $.get("/missions/" + mId);
        var mission = $(missionHtml);

        var checkboxes = mission.find(".vehicle_checkbox");

        if (!checkboxes || checkboxes.length === 0) {
            $("#tr_" + mId).removeClass("alert-info").addClass("alert-danger");
            $("#status_" + mId).text("Fahrzeuge außer Reichweite oder nicht vorhanden!");
            continue;
        }

        for (var v = 0; v < checkboxes.length; v++) {
            var vAttr = checkboxes[v].attributes;
            var vType = +vAttr.vehicle_type_id.value;
            var vId = +vAttr.value.value;

            if (config.vehicles.includes(vType) && !foundVehicles.includes(vId)) {
                $("#status_" + mId).text("alarmiere ...");

                await $.post('/missions/' + mId + '/alarm', { 'vehicle_ids': vId }).done(function () {
                    foundVehicles.push(vId);
                    $("#tr_" + mId).remove();
                    console.log(foundVehicles);
                });

                break;
            }

            if (v + 1 == checkboxes.length) {
                $("#tr_" + mId).removeClass("alert-info").addClass("alert-danger");
                $("#status_" + mId).text("Fahrzeuge außer Reichweite oder nicht vorhanden!");
                break;
            }
        }
    }
}

    function mapVehicles(arrClasses, trigger) {
        var returnValue = [];
        if (arrClasses && arrClasses.length) { 
            if (trigger == "type") {
                arrClasses.forEach(function (item) {
                    var matchingVehicle = aVehicleTypes.find((obj) => obj.short_name === item);
                    if (matchingVehicle) {
                        returnValue.push(matchingVehicle.id);
                    }
                });
            } else if (trigger == "name") {
                arrClasses.forEach(function (item) {
                    var matchingVehicle = aVehicleTypes.find((obj) => obj.id === item);
                    if (matchingVehicle) {
                        returnValue.push(matchingVehicle.short_name);
                    }
                });
            }
        }
        return returnValue;
    }

   $("body").on("click", "#chilloutArea", function() {
        if (allianceMissions.length === 0) {
            $("#YuhiModalBody").html(`<center><img src="https://yuhiamatsume.github.io/YuhiButton/splash.jpg" style="height:60%;width:60%"></center>`);
        }
    });

    $("body").on("click", "#YuhiScan", async function() {
        await scanMissions();
        await writeTable();
    });

    $("body").on("click", "#YuhiStart", function() {
        alertVehicles();
    });

    $("body").on("click", "#YuhiPreferences", async function() {
        const timeout = await getTimeoutPreference();

        var arrVehicles = [];
        for (var i in aVehicleTypes) {
            arrVehicles.push(aVehicleTypes[i].short_name);
        }
        arrVehicles.sort((a, b) => a.toUpperCase() > b.toUpperCase() ? 1 : -1);
    
        $("#YuhiModalBody").html(`
            <span>Einsätze ab </span>
            <input type="text" class="form-control form-control-sm" value="${config.minCredits || 0}" id="YuhiMinCredits" style="width:5em;height:22px;display:inline">
            <span> bis </span>
            <input type="text" class="form-control form-control-sm" value="${config.maxCredits || 1000000}" id="YuhiMaxCredits" style="width:5em;height:22px;display:inline">
            <span> Credits anzeigen</span>
            <br><br>
            <label for="YuhiTimeout">Timeout (ms): </label><input type="text" class="form-control form-control-sm" value="${timeout}" id="YuhiTimeout" style="width:5em;height:22px;display:inline"><span> ms</span>
            <br><br>
            <label for="YuhiMissionListActive">Eigene Einsätze berücksichtigen?</label>
            <input type="checkbox" id="YuhiMissionListActive" ${config.missionListActive ? 'checked' : ''}>
            <br><br>
            <label for="YuhiVehicleTypes">Fahrzeugtypen (Mehrfachauswahl mit Strg + Klick)</label>
            <select multiple class="form-control" id="YuhiVehicleTypes" style="height:20em;width:40em"></select>
            <br><br>
            <a class="btn btn-success" id="YuhiBtnSave">Speichern</a>
        `);
    
        for (i in arrVehicles) {
            $("#YuhiVehicleTypes").append(`<option>${arrVehicles[i]}</option>`);
        }
    
        $("#YuhiVehicleTypes").val(mapVehicles(config.vehicles, "name"));
    });

    $("body").on("click", "#YuhiBtnSave", async function() {
        config.minCredits = +$("#YuhiMinCredits").val();
        config.maxCredits = +$("#YuhiMaxCredits").val();
        config.vehicles = mapVehicles($("#YuhiVehicleTypes").val(), "type");
        config.missionListActive = $("#YuhiMissionListActive").is(":checked");
        await idbSet("YuhiConfig", config);
    
        var timeoutValue = $("#YuhiTimeout").val();
        setTimeoutPreference(timeoutValue);
    
        $("#YuhiModalBody").html("<h3><center>Einstellungen gespeichert</center></h3>");
    });

    $("body").on("click", "#close", async function() {
        // Save the state when the "Schließen" button is clicked
        await saveState();
    });

})();
