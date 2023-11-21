Map.addLayer(hab, {}, "vultures");

// import country layers
var countries = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level0");

// select Spain
var ROI = countries.filter(ee.Filter.eq("ADM0_NAME", "Spain"));

var random_non_hab_pts = ee.FeatureCollection.randomPoints(
  non_hab.geometry(0.001),
  1288,
  3,
  0.001
);

var random_hab_pts_set = hab
  .map(function (feature) {
    return feature.set("presence", 1);
  })
  .randomColumn();

var random_non_hab_pts_set = random_non_hab_pts
  .map(function (feature) {
    return feature.set("presence", 0);
  })
  .randomColumn();

var split = 0.7; // Roughly 70% training, 30% testing.

var training_pos = random_hab_pts_set.filter(ee.Filter.lt("random", split));
var training_neg = random_non_hab_pts_set.filter(ee.Filter.lt("random", split));

var testing_pos = random_hab_pts_set.filter(ee.Filter.gte("random", split));
var testing_neg = random_non_hab_pts_set.filter(ee.Filter.gte("random", split));

var hab_pts = training_pos.merge(training_neg).filterBounds(ROI);
var hab_input = testing_pos.merge(testing_neg).filterBounds(ROI);

var total_pts = random_hab_pts_set
  .merge(random_non_hab_pts_set)
  .filterBounds(ROI);

Map.addLayer(ROI, {}, "ROI", false);

var palettes = require("users/gena/packages:palettes");
var palette = palettes.misc.tol_rainbow[7];
var palette6 = palettes.colorbrewer.Oranges[3];

var geom = ROI;

var dataset = ee.Image("USGS/SRTMGL1_003").clip(ROI);
var elevation = dataset.select("elevation").rename("elevation");

var dataset = ee.ImageCollection("CAS/IGSNRR/PML/V2_v017").first().clip(ROI);

var precipitation = ee.Image("WORLDCLIM/V1/BIO").select("bio15").clip(ROI);
Map.addLayer(precipitation, {}, "Precipitation accumulation", false);

var alt = ee.Image("USGS/GMTED2010").clip(ROI);

var Temperature = ee.Image("WORLDCLIM/V1/BIO").select("bio04").clip(ROI);
Map.addLayer(Temperature, {}, "Temperature", false);

var hum = hum_mod.first().clip(ROI);

var All_Imagery = precipitation.addBands([Temperature, alt, hum]);

Map.addLayer(All_Imagery, {}, "All_Imagery", false);

var bands = All_Imagery.bandNames().getInfo();

var label = "presence"; ///[Team] update when we have the info

// //
var sample = All_Imagery.select(bands).sampleRegions({
  collection: hab_pts,
  properties: [label],
  scale: 30,
});
var testing_sample = All_Imagery.select(bands).sampleRegions({
  collection: hab_input,
  properties: [label],
  scale: 30,
});

var training = sample;
var testing = testing_sample;

var classifier_train = ee.Classifier.smileRandomForest({
  numberOfTrees: 10,
  seed: 7,
}).train({
  features: training,
  classProperty: label,
  inputProperties: bands,
  subsamplingSeed: 7,
});

var dict_RF = classifier_train.explain();

var variable_importance_RF = ee.Feature(
  null,
  ee.Dictionary(dict_RF).get("importance")
);

var chart_variable_importance_RF = ui.Chart.feature
  .byProperty(variable_importance_RF)
  .setChartType("ColumnChart")
  .setOptions({
    title: "Random Forest Variable Importance",
    legend: { position: "none" },
    hAxis: { title: "Bands" },
    vAxis: { title: "Importance" },
  });

print("chart_variable_importance_RF", chart_variable_importance_RF);

var classified_RF_train = training.classify(classifier_train);

var classified_RF_test = testing.classify(classifier_train);

var trainAccuracy = classified_RF_train.errorMatrix(label, "classification");
print("RF_Training_Resubstitution error matrix: ", trainAccuracy);
print("RF_Training overall accuracy: ", trainAccuracy.accuracy());

// Get a confusion matrix representing resubstitution accuracy.
var testAccuracy = classified_RF_test.errorMatrix(label, "classification");
print("RF_Testing_Resubstitution error matrix: ", testAccuracy);
print("RF_Testing overall accuracy: ", testAccuracy.accuracy());

// // Display the input and the classification.

var classifiedImage = All_Imagery.classify(classifier_train);

var Random_Forest_Output_hab = classifiedImage.eq(1);
var Random_Forest_Output_hab_only =
  Random_Forest_Output_hab.updateMask(classifiedImage);

Map.addLayer(
  Random_Forest_Output_hab_only,
  { min: 0, max: 1, palette: palette6 },
  "classified_RF"
);

var total = All_Imagery.addBands([classifiedImage]);

var vectors = total.sampleRegions({
  collection: total_pts,
  properties: [label],
  scale: 30,
  geometries: true,
});

vectors = vectors.map(function (feature) {
  return feature
    .set("long", feature.geometry().coordinates().get(0))
    .set("lat", feature.geometry().coordinates().get(1));
});

Export.table.toDrive({
  collection: vectors,
  description: "Vultures",
  folder: "Projects",
  fileFormat: "CSV",
});
