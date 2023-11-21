# Vulture Habitat Mapping

A script written in Javascript that utilizes the GEE platform to automatically construct phenologcally relivant indices as feature inouts for a Random Forest modeling framework to map the Egyptian vulture(Neophron percnopterus) in Spain.

# Aims of the project:

- To identify regions that correspond to suitable habitats for the Egyptian vulture(EV) and analyze the values for environmental variables related to this distribution.
- The ArcGis StoryMap helps communicate these results to the readers to get a better sense of the habitable conditions for the endangered EV by illustrating spatial relationships, and why their conservation is essential.

# Methodology:

The species-occurrence point data from [gbif](https://www.gbif.org/occurrence/search?country=ES&taxon_key=2480696&year=2020,2023) which provides the locations value of where environmental variables is extracted and a random forest classification model is done in Google Earth Engine where multiple decision trees are generated using random, but equally sized subsets of the data with majority voting deciding the final class of a point.

The interactive maps in the region in Spain that highlight areas that are habitable regions of the EV is displayed in this [ArcGis StoryMap](https://storymaps.arcgis.com/stories/43383b30416b4b88b8d07764e15090b2).
