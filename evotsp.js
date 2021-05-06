(function evoTSPwrapper($) {
  const baseUrl =
    "https://h7a2o93em4.execute-api.us-east-1.amazonaws.com/prod";

  var cityData;

  var lengthStoreThreshold = Infinity;

  var best = {
    runID: "",
    bestPath: [],
    len: Infinity,
    coords: [],
    lRoute: [[], []],
  };

  function runEvolution() {

    const runId = generateUID(16);
    const initialGeneration = 0;
    $("#runId-text-field").val(runId);
    $("#current-generation").text(initialGeneration);

    async.series([  
      initializePopulation,
      runAllGenerations,
      showAllDoneAlert,
    ]);

    function initializePopulation(cb) {
      const populationSize = parseInt($("#population-size-text-field").val());
      console.log(
        `Initializing pop for runId = ${runId} with pop size ${populationSize}, generation = ${initialGeneration}`
      );
      $("#new-route-list").text("");
      async.times(
        populationSize, 
        (counter, rr_cb) => randomRoute(runId, initialGeneration, rr_cb),
        cb
      );
    }
    
    function runAllGenerations(cb) {
      const numGenerations = parseInt($("#num-generations").val());

      async.timesSeries(
        numGenerations,
        runGeneration,
        cb
      );
    }

    function showAllDoneAlert(cb) {
      alert("All done! (but there could still be some GUI updates)");
      cb();
    }

    function generateUID(length) {
      return window
        .btoa(
          Array.from(window.crypto.getRandomValues(new Uint8Array(length * 2)))
            .map((b) => String.fromCharCode(b))
            .join("")
        )
        .replace(/[+/]/g, "")
        .substring(0, length);
    }  
  }

  function randomRoute(runId, generation, cb) {
    $.ajax({
      method: 'POST',
      url: baseUrl + '/routes',
      data: JSON.stringify({runId,generation}),
      contentType: 'application/json',
      //(data) => {console.log(data),cb(null, data)}
      success: (data) => {console.log(data),cb(null, data)},
      error: function ajaxError(jqXHR, textStatus, errorThrown) {
          console.error(
              'Error generating random route: ', 
              textStatus, 
              ', Details: ', 
              errorThrown);
          console.error('Response: ', jqXHR.responseText);
          alert('An error occurred when creating a random route:\n' + jqXHR.responseText);
          cb(errorThrown);
      }
    })
  }

  function runGeneration(generation, cb) {
    const popSize = parseInt($("#population-size-text-field").val());
    console.log(`Running generation ${generation}`);

    async.waterfall(
      [
        wait5seconds,
        updateGenerationHTMLcomponents,
        async.constant(generation),
        (gen, log_cb) => logValue("generation", gen, log_cb),
        getBestRoutes,
        (parents, log_cb) => logValue("parents", parents, log_cb),
        displayBestRoutes,
        updateThresholdLimit,
        generateChildren,
        (children, log_cb) => logValue("children", children, log_cb),
        displayChildren,
        updateBestRoute
      ],
      cb
    );

    function logValue(label, value, log_cb) {
      console.log(`In waterfall: ${label} = ${JSON.stringify(value)}`);
      log_cb(null, value);
    }

    function wait5seconds(wait_cb) {
      console.log(`Starting sleep at ${Date.now()}`);
      setTimeout(function () {
        console.log(`Done sleeping gen ${generation} at ${Date.now()}`);
        wait_cb(); // Call wait_cb() after the message to "move on" through the waterfall
      }, 5000);
    }

    function updateGenerationHTMLcomponents(reset_cb) {
      $("#new-route-list").text("");
      $("#current-generation").text(generation + 1);
      reset_cb();
    }

    function generateChildren (parents, genChildren_cb) {
      const numChildren = Math.floor(popSize / parents.length);

      async.concat( // each(
        parents,
        (parent, makeChildren_cb) => {
          makeChildren(parent, numChildren, makeChildren_cb);
        },
        genChildren_cb
      );
    }

    function updateThresholdLimit(bestRoutes, utl_cb) {
      if (bestRoutes.length == 0) {
        const errorMessage = 'We got no best routes back. We probably overwhelmed the write capacity for the database.';
        alert(errorMessage);
        throw new Error(errorMessage);
      }
      lengthStoreThreshold = bestRoutes[bestRoutes.length - 1].len;
      $("#current-threshold").text(lengthStoreThreshold);
      utl_cb(null, bestRoutes);
    }
  }

  function getBestRoutes(generation, callback) {
    // FILL THIS IN
    const runId = $('#runId-text-field').val();
    const numParents = $('#num-parents').val();

    $.ajax({
      method: 'GET',
      url: baseUrl + `/best?runId=${runId}&generation=${generation}&numToReturn=${numParents}`,
      contentType: 'application/json',

      success: (bestRoutes) => callback(null, bestRoutes),
      error: function ajaxError(jqXHR, textStatus, errorThrown) {
          console.error(
              'Error generating best routes: ', 
              textStatus, 
              ', Details: ', 
              errorThrown);
          console.error('Response: ', jqXHR.responseText);
          alert('An error occurred when best routes:\n' + jqXHR.responseText);
      }
  })
  }

  function makeChildren(parent, numChildren, cb) {
    const routeId = parent.routeId;

    $.ajax({
      method: 'POST',
      url: baseUrl + `/mutate-route`,
      data: JSON.stringify({routeId,numChildren,lengthStoreThreshold}),
      contentType: 'application/json',

      success: children => cb(null, children),
      error: function ajaxError(jqXHR, textStatus, errorThrown) {
          console.error(
              'Error making children: ', 
              textStatus, 
              ', Details: ', 
              errorThrown);
          console.error('Response: ', jqXHR.responseText);
          alert('An error occurred when making children:\n' + jqXHR.responseText);
      }
    })
  }

  function getRouteById(routeId, callback) {

        $.ajax({
            method: 'GET',
            url: baseUrl + `/routes/${routeId}`,
            contentType: 'application/json',

            success: callback,
            error: function ajaxError(jqXHR, textStatus, errorThrown) {
                console.error(
                    'Error retrieving route: ', 
                    textStatus, 
                    ', Details: ', 
                    errorThrown);
                console.error('Response: ', jqXHR.responseText);
                alert('An error occurred when retrieving route:\n' + jqXHR.responseText);
            }
        })
  }

  function fetchCityData(callback) {
    // FILL THIS IN
    $.ajax({
      method: 'GET',
      url: baseUrl + `/city-data`,
      contentType: 'application/json',

      success: callback,
      error: function ajaxError(jqXHR, textStatus, errorThrown) {
          console.error(
              'Error retrieving city-data: ', 
              textStatus, 
              ', Details: ', 
              errorThrown);
          console.error('Response: ', jqXHR.responseText);
          alert('An error occurred when city data:\n' + jqXHR.responseText);
      }
    })
  }

  function displayBestPath() {
    $("#best-length").text(best.len);
    $("#best-path").text(JSON.stringify(best.bestPath));
    $("#best-routeId").text(best.routeId);
    $("#best-route-cities").text("");
    best.bestPath.forEach((index) => {
      const cityName = cityData[index].properties.name;
      $("#best-route-cities").append(`<li>${cityName}</li>`);
    });
  }

  function displayChildren(children, dc_cb) {
    children.forEach(child => displayRoute(child));
    dc_cb(null, children);
  }

  function displayRoute(result) {
    const {routeId, len} = result;
    $('#new-route-list').append(`<li>We generated a child route ${routeId} with length ${len}.</li>`);
  }

  function displayBestRoutes(bestRoutes, dbp_cb) {
    $('#best-route-list').text('')
    bestRoutes.forEach(element => {
      const {routeId,len} = element;
      $('#best-route-list').append(`<li>We got best route ${routeId} with length ${len}.</li>`);
    });
    dbp_cb(null,bestRoutes);
  }

  function updateBestRoute(children, ubr_cb) {
    children.forEach(child => {
      if (child.len < best.len) {
        updateBest(child.routeId);
      }
    });
    ubr_cb(null, children);
  }

  function updateBest(routeId) {
    getRouteById(routeId, processNewRoute);

    function processNewRoute(route) {
      if (best.len > route.len && route == "") {
        console.log(`Getting route ${routeId} failed; trying again.`);
        updateBest(routeId);
        return;
      }
      if (best.len > route.len) {
        console.log(`Updating Best Route for ${routeId}`);
        best.routeId = routeId;
        best.len = route.len;
        best.bestPath = route.route;
        displayBestPath(); // Display the best route on the HTML page
        best.bestPath[route.route.length] = route.route[0]; // Loop Back
        updateMapCoordinates(best.bestPath); 
        mapCurrentBestRoute();
      }
    }
  }

  function mapCurrentBestRoute() {
    var lineStyle = {
      dashArray: [10, 20],
      weight: 5,
      color: "#0000FF",
    };

    var fillStyle = {
      weight: 5,
      color: "#FFFFFF",
    };

    if (best.lRoute[0].length == 0) {
      // Initialize first time around
      best.lRoute[0] = L.polyline(best.coords, fillStyle).addTo(mymap);
      best.lRoute[1] = L.polyline(best.coords, lineStyle).addTo(mymap);
    } else {
      best.lRoute[0] = best.lRoute[0].setLatLngs(best.coords);
      best.lRoute[1] = best.lRoute[1].setLatLngs(best.coords);
    }
  }

  function initializeMap(cities) {
    cityData = [];
    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];
      const cityName = city.cityName;
      var geojsonFeature = {
        type: "Feature",
        properties: {
          name: "",
          show_on_map: true,
          popupContent: "CITY",
        },
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      };
      geojsonFeature.properties.name = cityName;
      geojsonFeature.properties.popupContent = cityName;
      geojsonFeature.geometry.coordinates[0] = city.location[1];
      geojsonFeature.geometry.coordinates[1] = city.location[0];
      cityData[i] = geojsonFeature;
    }

    var layerProcessing = {
      pointToLayer: circleConvert,
      onEachFeature: onEachFeature,
    };

    L.geoJSON(cityData, layerProcessing).addTo(mymap);

    function onEachFeature(feature, layer) {
      // does this feature have a property named popupContent?
      if (feature.properties && feature.properties.popupContent) {
        layer.bindPopup(feature.properties.popupContent);
      }
    }

    function circleConvert(feature, latlng) {
      return new L.CircleMarker(latlng, { radius: 5, color: "#FF0000" });
    }
  }

  function updateMapCoordinates(path) {
    function swap(arr) {
      return [arr[1], arr[0]];
    }
    for (var i = 0; i < path.length; i++) {
      best.coords[i] = swap(cityData[path[i]].geometry.coordinates);
    }
    best.coords[i] = best.coords[0]; // End where we started
  }

  $(function onDocReady() {
    // These set you up with some reasonable defaults.
    $("#population-size-text-field").val(100);
    $("#num-parents").val(20);
    $("#num-generations").val(20);
    $("#run-evolution").click(runEvolution);

    fetchCityData(initializeMap);
  });
})(jQuery);
