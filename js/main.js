/* By Natalie Young, 2022
I heavily relied on the code and example of github user adp6729, lab link: https://adp6729.github.io/leaflet-lab/# (thank you!)
However, I have updated every major element on the page with my own data or settings and removed several inapplicable code lines*/

// GOAL: Spatiotemporal proportional point symbol map

var currentMap = 0 // Global variable to hold the leaflet map object

// Function to instantiate the Leaflet map
function createMap(){
    
    // Create the map
    var map = L.map('map', {
        center: [47.25, -121.7],
        zoom: 7
    })

    // Add OSM base tilelayer
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map)
    
    // Set global map variable to map object
    currentMap = map

    //call getData function
    getData(map)
}

// Initialize global variables for use later
var currentLayer = 0 		// holds geoJsonLayer for future modifications
var currentAttributes = 0 	// Percentage attribute names
var currentAttributes2 = 0 	// Population attribute names
var currentFilter = 'all' 	// current Filter selection, initially 'all'
var rawJson = 0 			// holds ajax response, aka raw json data
var featureSelected = 0 	// holds the currently selected city information
var currentAttribute = 0 	// holds the currently selected Percentage attribute name
var currentAttribute2 = 0 	// holds the currently selected Population attribute name

// Function to retrieve the data via ajax and place it on the map
function getData(map){
    
    // Load the data
    $.ajax("data/WAcities50k.geojson", {
        dataType: "json",
        success: function(response){
            // Set global rawJson to ajax response
            rawJson = response
            
            // Process rawJson/response into lists of data sets- population values, and population CHANGE values
            var processedAttributes = processData(response)
            currentAttributes = processedAttributes[0]
            currentAttributes2 = processedAttributes[1]
			
			//uncomment these to check contents of currentAttribues, currentAttributes2
			//console.log("currentAttributes are " + currentAttributes);
			//console.log("currentAttributes2 are " + currentAttributes2);
            
            // Call function to create proportional symbols, put in a layer
            geoJsonLayer = createPropSymbols(response, map, 0, currentFilter)
            currentLayer = geoJsonLayer
            
            // Call function to create sequence controls for user
            createSequenceControls(map, currentAttributes)
            
            //add geo JSON layer to map
            map.addLayer(geoJsonLayer)
			//console.log("your geojson was added to the map");
        }
    })
}

// Build attributes arrays from the data
function processData(data){
    // Empty arrays to hold attributes
    var attributes = []
    var attributes2 = []

    // Properties of the first feature in the dataset
    var properties = data.features[0].properties

    // Push each attribute name into attributes array
    for (var attribute in properties){
        //catalog attributes with population values
        if (attribute.indexOf("totpop") > -1){
            attributes.push(attribute)
			//console.log(attribute);
        }
        //catalog attributes with population CHANGE values
        if (attribute.indexOf("chg") > -1){
            attributes2.push(attribute)
			//console.log(attribute);
        }
    }

    return [attributes, attributes2]
}
    
function createPropSymbols(data, map, idx, filterStr) {
    
    // Get and store current attributes based on index (idx)
    var attribute = currentAttributes[idx]
    currentAttribute = attribute
    var attribute2 = currentAttributes2[idx]
    currentAttribute2 = attribute2
    
    // Create marker options
    var geojsonMarkerOptions = {
        radius: 2,
        fillColor: "#46d606",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.6
    }
    
    var geoJsonOptions = {
        pointToLayer: function (feature, latlng){
            
            // For each feature, determine its value for the selected attribute
            var attValue = Number(feature.properties[attribute])
            
			/*
            // Test for variable type, then give each feature's circle marker a radius based on its attribute value 
            // This code was written in hopes of adding a switch to flip to population as the main variable on the map
            var strTest = attribute.search("totpop")
            if (strTest > -1) {
                geojsonMarkerOptions.radius = calcPropRadius(attValue, 0.1)
                details = ["Population", ""]
                details2 = ["Percentage", "%"]
            } else {
                geojsonMarkerOptions.radius = calcPropRadius(attValue, 900)
                details = ["Percentage", "%"]                
                details2 = ["Population", ""]
            }*/
            
			//Adjust circle marker radius based on attribute value
			geojsonMarkerOptions.radius = calcPropRadius(attValue, .02)
			
            // Create circle marker layer
            var layer = L.circleMarker(latlng, geojsonMarkerOptions)
            
            // Build popup content string
            var popupContent = "<p><b>" + feature.properties.placename + ", WA" + "</p>"
            var year = attribute.slice(-4)
            popupContent += "<p><b>" + "Population in " + year + ":</b> " + feature.properties[attribute] + "</p>"
            //popupContent2 = popupContent + "<p><b>" + details2[0] + " in " + year + ":</b> " + feature.properties[currentAttribute2] + details2[1] + "</p>"

            // Bind the popup to the circle marker
            layer.bindPopup(popupContent, {
                offset: new L.Point(0, -geojsonMarkerOptions.radius),
                closeButton: false
            })
            
            // Event listeners to open popup on hover, update the info panel on click and
            // Add clicked feature to global variable for future use
            layer.on({
                mouseover: function(){
                    this.openPopup()
                },
                mouseout: function(){
                    this.closePopup()
                },
                click: function(){
                    featureSelected = feature
                    updatePanel(currentAttribute)
                }
            })

            return layer
        },
        filter: function(feature, layer) { // Add filter function for new geoJsonLayer
            // If the data-filter attribute is set to "all", return all (true)
            // Otherwise, filter markers based on population size
            var returnBool = false
            if (filterStr === 'all'){
                returnBool = true
            } else if (filterStr === 'big'){
                if (feature.properties[currentAttribute] >= 100000) {
                    returnBool = true
                }
            } else if (filterStr === 'medium'){
                if ((feature.properties[currentAttribute] < 100000) && (feature.properties[currentAttribute] >= 75000)) {
                    returnBool = true
                }
            } else if (filterStr === 'small'){
                if ((feature.properties[currentAttribute] < 75000)) {
                    returnBool = true
                }
            } 
            return returnBool
        }
    }
    
    // Create a Leaflet GeoJSON layer, based on rawJson data and previously defined geoJsonOptions
    var geoJsonLayer = L.geoJson(data, geoJsonOptions)
    
    return geoJsonLayer    
}

// Calculate the radius of each proportional symbol
function calcPropRadius(attValue, scaleFactor) {

    // Area based on attribute value and scale factor
    var area = attValue * scaleFactor

    // Radius calculated based on area
    var radius = Math.sqrt(area/Math.PI)

    return radius
}

// Create new sequence controls
function createSequenceControls(map, attributes){
    
    // Add skip button for "reverse" functionality, replace button content with image
    $('#panel2').append('<button class="skip" id="reverse">Reverse</button>')  
    $('#reverse').html('<img src="img/leftarrow.png">')
    
    // Create range input element (slider)
    $('#panel2').append('<input class="range-slider" type="range">')
    
    // Add skip button for "forward" functionality, replace button content with image
    $('#panel2').append('<button class="skip" id="forward">Skip</button>')    
    $('#forward').html('<img src="img/rightarrow.png">')
    
    // Set slider attributes
    $('.range-slider').attr({
        max: 6,
        min: 0,
        value: 0,
        step: 1
    })
    
    // Click listener for buttons
    $('.skip').click(function(){
        // Get the old index value
        var index = $('.range-slider').val()

        // Increment or decrement depending on button clicked
        if ($(this).attr('id') == 'forward'){
            index++
            // If past the last attribute, wrap around to first attribute
            index = index > 6 ? 0 : index
        } else if ($(this).attr('id') == 'reverse'){
            index--
            // If past the first attribute, wrap around to last attribute
            index = index < 0 ? 6 : index
        }

        // Update slider after arrow click
        $('.range-slider').val(index)
        
        // Rebuild layer as population values may have changed during time sequence
        currentMap.removeLayer(geoJsonLayer)
        geoJsonLayer = createPropSymbols(rawJson, currentMap, index, currentFilter)
        currentLayer = geoJsonLayer
        currentMap.addLayer(geoJsonLayer)
        
        // Reset current attributes and update the info panel
        currentAttribute = currentAttributes[index]
        currentAttribute2 = currentAttributes2[index]
        updatePanel()
        
        // Update legend title with new year
        $('#legendTitle').text("Population in " + currentAttribute.slice(-4))
    })

    // Input listener for slider
    $('.range-slider').on('input', function(){
        // Get the new index value
        var index = $(this).val()
        
        // Rebuild layer as population values may have changed during time sequence
        currentMap.removeLayer(geoJsonLayer)
        geoJsonLayer = createPropSymbols(rawJson, currentMap, index, currentFilter)
        currentLayer = geoJsonLayer
        currentMap.addLayer(geoJsonLayer)
        
        // Reset current attributes and update the info panel
        currentAttribute = attributes[index]
        currentAttribute2 = currentAttributes2[index]
        updatePanel()
        
        // Update legend title with new year
        $('#legendTitle').text("Population in " + currentAttribute.slice(-4))
    })
}

// Function to update the information panel on the right
function updatePanel() {
    if (featureSelected != 0) {
        
		
		/*
		// Determine the nature of the main variable
        var strTest = currentAttribute.search("totpop")
        if (strTest > -1) {
            details = ["Population", ""]
            details2 = ["Percentage", "%"]
        } else {
            details = ["Percentage", "%"]
            details2 = ["Population", ""]
        }
		*/

        // Utilize current feature, currentAttributes to create popup content
        var popupContent = "<h3><p><b>" + featureSelected.properties.placename + "</b>" + ", WA" + "</p></h3>"
        var year = currentAttribute.slice(-4)
        popupContent += "<p><b>" + "Population in " + year + ": </b>" + featureSelected.properties[currentAttribute] + "</p>"
		popupContent += "<p><b>" + "Population Change 1970 to 2020: " + "</b>" + featureSelected.properties.chg_1970_to_2020 + " (" + featureSelected.properties.chgp_1970_2020 + "%)" + "</p>"

        // Update panel with new popup content
        $("#panel").html(popupContent)
    }
}

// Click listener for the filter menu
$('.menu-ui a').on('click', function() {
    // For each filter link, get the 'data-filter' attribute value.
    var filter = $(this).data('filter')
    
    // Set global variable for future use
    currentFilter = filter
    
    // Change which filter menu option is active, get slider index
    $(this).addClass('active').siblings().removeClass('active')
    var currentIdx = $('.range-slider').val()
    
    // Remvoe current map layer, create new one with appropriate filter
    currentMap.removeLayer(geoJsonLayer)
    geoJsonLayer = createPropSymbols(rawJson, currentMap, currentIdx, filter)
    currentLayer = geoJsonLayer
    
    // Add new layer to map, wipe away the info panel
    currentMap.addLayer(geoJsonLayer)
    $("#panel").html("")
})

$(document).ready(createMap)
