// utilitaire
Array.prototype.sum = function(exp=a=>a) {return this.map(exp).reduce((a, b) => a + b, 0)}


function executer_modele(globals, iterations) {
	// constantes
	const landCovers = {
		nothing: {color: {r: 255, g: 255, b: 255}, rain2gbiomass: 0, nbTrees: 0, gconsumable: 0, lconsumable: 0, soilC: 0, Nstock: 0, kp: 0, Nmax: 0},
		productionUnit: {color: {r: 255, g: 0, b: 0}, rain2gbiomass: 0, nbTrees: 0, gconsumable: 0, lconsumable: 0, soilC: 0, Nstock: 0, kp: 0, Nmax: 0},
		waterOutput: {color: {r: 0, g: 0, b: 255}, rain2gbiomass: 0, nbTrees: 0, gconsumable: 0, lconsumable: 0, soilC: 0, Nstock: 0, kp: 0, Nmax: 0},
		crop: {color: {r: 171, g: 236, b: 177}, rain2gbiomass: 1.9, nbTrees: 5, gconsumable: 60, lconsumable: 33, soilC: 0.3, Nstock: 3_000, kp: 0.25, Nmax: 4_000},
		forage: {color: {r: 18, g: 88, b: 24}, rain2gbiomass: 1.9, nbTrees: 5, gconsumable: 60, lconsumable: 33, soilC: 0.3, Nstock: 3_000, kp: 0.25, Nmax: 4_000},
		grass: {color: {r: 44, g: 209, b: 60}, rain2gbiomass: 1.8, nbTrees: 5, gconsumable: 80, lconsumable: 33, soilC: 0.15, Nstock: 3_000, kp: 0.25, Nmax: 4_000},
		agroforestry: {color: {r: 216, g: 197, b: 182}, rain2gbiomass: 1.8, nbTrees: 112, gconsumable: 60, lconsumable: 33, soilC: 0.3, Nstock: 3_000, kp: 0.25, Nmax: 4_000},
		sylvopastoralg: {color: {r: 157, g: 110, b: 72}, rain2gbiomass: 1.9, nbTrees: 201, gconsumable: 80, lconsumable: 33, soilC: 0.2, Nstock: 3_000, kp: 0.25, Nmax: 4_000},
		sylvopastoralf: {color: {r: 66, g: 46, b: 30}, rain2gbiomass: 1.9, nbTrees: 201, gconsumable: 80, lconsumable: 33, soilC: 0.2, Nstock: 3_000, kp: 0.25, Nmax: 4_000}
	}
	globals.maleMax = globals.maleClasses.adult.maxage
	globals.femaleMax = globals.femaleClasses.adult.maxage
	globals.milkingMinAge = globals.femaleClasses.adult.minage
	globals.males = []
	globals.females = []
	for (let [name, c] of Object.entries(globals.maleClasses)) {
		c.class = name
		for (let age=c.minage; age<=c.maxage; age++)
			globals.males.push(c)
	}
	for (let [name, c] of Object.entries(globals.femaleClasses)) {
		c.class = name
		for (let age=c.minage; age<=c.maxage; age++)
			globals.females.push(c)
	}
	for (let [name, c] of Object.entries(landCovers)) {
		c.landCover = name
		c.gbiomass = 0
		c.soilN = c.Nstock * globals.plotSurface
		c.water = globals.initialWater * globals.plotSurface
	}



	// initialisation de la simulation
	let totalFarmSurface = globals.cropSurface + globals.grassSurface + globals.forageSurface + globals.agroforestrySurface + globals.sylvopastoralgSurface + globals.sylvopastoralfSurface
	let totalCommonSurface = globals.clCropSurface + globals.clGrassSurface + globals.clForageSurface + globals.clAgroforestrySurface + globals.clSylvopastoralgSurface + globals.clSylvopastoralfSurface
	let farmRadius = Math.max(10, Math.ceil(Math.sqrt(totalFarmSurface / Math.PI)))
	let nbFarmPerLineCol = Math.ceil(Math.sqrt(globals.productionUnitNumber))
	let nbLineCol = Math.max(50, nbFarmPerLineCol * farmRadius * 2)
	let totalSurface = nbLineCol * nbLineCol
	let remainingSurface = totalSurface - totalFarmSurface * globals.productionUnitNumber
	let additionalLines = (remainingSurface < totalCommonSurface) ? Math.ceil((totalCommonSurface - remainingSurface) / nbLineCol) : 0
	let canvas = document.createElement("canvas")
	let width = canvas.width = nbLineCol
	let height = canvas.height = nbLineCol + additionalLines
	let ctx = canvas.getContext("2d")



	// initialisation des cellules
	let patches = []
	for (let y=0; y<height; y++) {
		for (let x=0; x<width; x++) {
			patches.push({x, y, ...landCovers.nothing})
		}
	}
	function resetSynchronousStateVariables() {
		for (let p of patches) {
			p.livestock = 0
			p.dung = 0
			p.gazEmission = 0
		}
		for (let p of productionUnits) {
			p.biomassNeed = 0
			p.feedNeed = 0
			p.pastureNeed = 0
			p.residueNeed = 0
			p.leafNeed = 0
			p.feedConsumed = 0
			p.pastureConsumed = 0
			p.residueConsumed = 0
			p.leafConsumed = 0
			p.forageConsumed = 0
			p.cpastureConsumed = 0
			p.cresidueConsumed = 0
			p.cleafConsumed = 0
			p.cforageConsumed = 0
			p.boughtFertilizer = 0
			p.starved = 0
			p.death = 0
			p.oldMaleKilled = 0
			p.oldFemaleKilled = 0
			p.killed = 0
			p.productionUFL = 0
			p.milkProduction = 0
			p.cash = globals.initialCash
			p.rmilkIncome = 0
			p.rmeatIncome = 0
			p.tmilkIncome = 0
			p.tmeatIncome = 0
			p.residueExpense = 0
			p.feedExpense = 0
			p.fertilizerExpense = 0
			p.membershipExpense = 0
			p.co2Emission = 0
		}
	}



	// initialisation des unités de production
	let productionUnits = []
	for (let i=0; i<globals.productionUnitNumber; i++) {
		let posx = farmRadius + i % 3 * farmRadius * 2
		let posy = farmRadius + Math.trunc(i / 3) * farmRadius * 2
		Object.assign(patches[posy * width + posx], landCovers.productionUnit)
		let {cropSurface, grassSurface, forageSurface, agroforestrySurface, sylvopastoralgSurface, sylvopastoralfSurface} = globals
		let possiblePlots = []
		for (let x=0; x<width; x++) {
			for (let y=0; y<height; y++) {
				if ((x!=posx || y!=posy) && Math.hypot(x-posx, y-posy) <= farmRadius)
					possiblePlots.push({x, y})
			}
		}
		possiblePlots.sort((a, b) => Math.hypot(a.x-posx, a.y-posy) - Math.hypot(b.x-posx, b.y-posy))
		let plots = []
		for (let {x, y} of possiblePlots) {
			if (cropSurface > 0) {
				cropSurface--
				Object.assign(patches[y * width + x], landCovers.crop)
			} else if (grassSurface > 0) {
				grassSurface--
				Object.assign(patches[y * width + x], landCovers.grass)
			} else if (forageSurface > 0) {
				forageSurface--
				Object.assign(patches[y * width + x], landCovers.forage)
			} else if (agroforestrySurface > 0) {
				agroforestrySurface--
				Object.assign(patches[y * width + x], landCovers.agroforestry)
			} else if (sylvopastoralgSurface > 0) {
				sylvopastoralgSurface--
				Object.assign(patches[y * width + x], landCovers.sylvopastoralg)
			} else if (sylvopastoralfSurface > 0) {
				sylvopastoralfSurface--
				Object.assign(patches[y * width + x], landCovers.sylvopastoralf)
			} else break
			plots.push(patches[y * width + x])
		}
		let males = []
		let females = []
		let nb = globals.livestockSize / (globals.males.length + globals.females.length)
		for (let age=0; age<globals.males.length; age++)
			males.push(nb)
		for (let age=0; age<globals.females.length; age++)
			females.push(nb)
		productionUnits.push({x: posx, y: posy, plots, males, females})
	}



	// initialisation du reste du terrain
	let commonPlots = []
	let {clCropSurface, clGrassSurface, clForageSurface, clAgroforestrySurface, clSylvopastoralgSurface, clSylvopastoralfSurface} = globals
	for (let y=0; y<height; y++) {
		for (let x=0; x<width; x++) {
			if (patches[y * width + x].landCover === "nothing") {
				if (clCropSurface > 0) {
					clCropSurface--
					Object.assign(patches[y * width + x], landCovers.crop)
				} else if (clGrassSurface > 0) {
					clGrassSurface--
					Object.assign(patches[y * width + x], landCovers.grass)
				} else if (clForageSurface > 0) {
					clForageSurface--
					Object.assign(patches[y * width + x], landCovers.forage)
				} else if (clAgroforestrySurface > 0) {
					clAgroforestrySurface--
					Object.assign(patches[y * width + x], landCovers.agroforestry)
				} else if (clSylvopastoralgSurface > 0) {
					clSylvopastoralgSurface--
					Object.assign(patches[y * width + x], landCovers.sylvopastoralg)
				} else if (clSylvopastoralfSurface > 0) {
					clSylvopastoralfSurface--
					Object.assign(patches[y * width + x], landCovers.sylvopastoralf)
				} else break
				commonPlots.push(patches[y * width + x])
			}
		}
	}
	let usedPlots = patches.filter(p => !["nothing", "farm"].includes(p.landCover))



	// patch dynamics
	function environmentUpdateNutrient() {
		for (let p of patches) {
			if (p.landCover === "nothing")
				continue
			p.soilN += (p.lbiomass * globals.llbiomass2C * (1 - globals.lmineralization / 100)) +
			           (p.dung     * globals.livestock2C * (1 - globals.dmineralization / 100))
			p.soilN += (["forage", "sylvopastoralf"].includes(p.landCover)) ?
				(p.gbiomass * globals.flbiomass2C * (1 - globals.fmineralization / 100)) :
				(p.gbiomass * globals.glbiomass2C * (1 - globals.gmineralization / 100))
		}
	}
	function environmentComputeBiomass() {
		for (let p of patches) {
			if (p.rain2gbiomass > 0)
				p.gbiomass = globals.pluviometry * p.rain2gbiomass * globals.plotSurface * p.soilN * p.kp / p.Nmax
			p.lbiomass = p.nbTrees * globals.tree2lbiomass
			p.tbiomass = p.nbTrees * globals.tree2tbiomass
		}
	}
	function environmentUpdateWater() {
		for (let p of patches) {
			p.waterGrowth = globals.pluviometry * 10_000 * (1 - globals.ewc / 100) * globals.plotSurface - (p.gbiomass + p.lbiomass + p.tbiomass) * globals.bwc
			p.water = Math.max(0, p.water + p.waterGrowth)
		}
	}
	function environmentUpdateCarbon() {
		for (let p of patches) {
			let soilCinput = (p.lbiomass * globals.llbiomass2C * (1 - globals.lmineralization / 100)) +
			                 (p.dung     * globals.livestock2C * (1 - globals.dmineralization / 100))
			if (["forage", "sylvopastoralf"].includes(p.landCover))
				soilCinput += p.gbiomass * globals.flbiomass2C * (1 - globals.fmineralization / 100)
			else
				soilCinput += p.gbiomass * globals.glbiomass2C * (1 - globals.gmineralization / 100)
			p.soilC += soilCinput - globals.cEmission / 100 * p.soilC
		}
	}
	function environmentUpdateGazEmission() {
		for (let p of patches) {
			p.gazEmission = p.dung * globals.manureCh4Emission * globals.ch4toco2 +
			                p.dung * globals.manureN2oEmission * globals.n2otoco2
			p.gazEmission += p.lbiomass * globals.llbiomass2C * globals.lmineralization / 100 * globals.c2co2 +
			                 p.dung     * globals.livestock2C * globals.dmineralization / 100 * globals.c2co2 +
			                 globals.cEmission * p.soilC * globals.c2co2
			if (["forage", "sylvopastoralf"].includes(p.landCover))
				p.gazEmission += p.gbiomass * globals.flbiomass2C * globals.fmineralization / 100 * globals.c2co2
			else
				p.gazEmission += p.gbiomass * globals.glbiomass2C * globals.gmineralization / 100 * globals.c2co2
		}
	}



	// production units dynamics
	function productionUnitDecideFertilization(p) {
		let cost = Math.min(p.cash, globals.fertilizer * globals.fertilizerPrice)
		p.cash -= cost
		p.fertilizerExpense += cost
		p.boughtFertilizer = cost / globals.fertilizerPrice
		let cropWeight = p.boughtFertilizer * globals.cropFertilization / 100
		let grassWeight = p.boughtFertilizer * globals.grassFertilization / 100
		let forageWeight = p.boughtFertilizer * globals.forageFertilization / 100
		let crops = p.plots.filter(plot => ["crop", "agroforestry"].includes(plot.landCover))
		let grass = p.plots.filter(plot => ["grass", "sylvopastoralg"].includes(plot.landCover))
		let forages = p.plots.filter(plot => ["forage", "sylvopastoralf"].includes(plot.landCover))
		for (let plot of crops)
			plot.soilN += cropWeight / crops.length
		for (let plot of grass)
			plot.soilN += grassWeight / grass.length
		for (let plot of forages)
			plot.soilN += forageWeight / forages.length
	}
	function productionUnitConsumePasture(p, grazingPlots, pasturePerHead, leafPerHead, shareFactor) {
		if (grazingPlots.length === 0 || p.pastureNeed === 0 && p.leafNeed === 0)
			return;
		while (grazingPlots.length > 0 && (p.pastureConsumed + p.cpastureConsumed < p.pastureNeed || p.leafConsumed + p.cleafConsumed < p.leafNeed)) {
			let aPlot = grazingPlots[Math.trunc(Math.random() * grazingPlots.length)]
			if (p.pastureConsumed + p.cpastureConsumed < p.pastureNeed) {
				let consumable = Math.min(aPlot.gbiomass * aPlot.gconsumable / 100, p.pastureNeed - p.pastureConsumed - p.cpastureConsumed)
				aPlot.livestock = consumable / pasturePerHead
				aPlot.gbiomass -= consumable
				aPlot.dung += consumable * (1 - globals.grassDigestibility / 100)
				if (shareFactor)
					p.pastureConsumed += consumable
				else
					p.cpastureConsumed += consumable
			}
			if (p.leafConsumed + p.cleafConsumed < p.leafNeed) {
				let consumable = Math.min(aPlot.lbiomass * aPlot.lconsumable / 100, p.leafNeed - p.leafConsumed - p.cleafConsumed)
				aPlot.livestock = Math.max(aPlot.livestock, consumable / leafPerHead)
				aPlot.lbiomass -= consumable
				aPlot.dung += consumable * (1 - globals.leafDigestibility / 100)
				if (shareFactor)
					p.leafConsumed += consumable
				else
					p.cleafConsumed += consumable
			}
			grazingPlots.splice(grazingPlots.indexOf(aPlot), 1)
		}
	}
	function productionUnitConsumeForage(p, grazingPlots, foragePerHead, leafPerHead, shareFactor) {
		if (grazingPlots.length === 0 || p.forageNeed === 0 && p.leafNeed === 0)
			return;
		while (grazingPlots.length === 0 && (p.forageConsumed + p.cforageConsumed < p.forageNeed || p.leafConsumed + p.cleafConsumed < p.leafNeed)) {
			let aPlot = grazingPlots[Math.trunc(Math.random() * grazingPlots.length)]
			if (p.forageConsumed + p.cforageConsumed < p.forageNeed) {
				let consumable = Math.min(aPlot.gbiomass * aPlot.gconsumable / 100, p.forageNeed - p.forageConsumed - p.cforageConsumed)
				aPlot.livestock = consumable / foragePerHead
				aPlot.gbiomass -= consumable
				aPlot.dung += consumable * (1 - globals.forageDigestibility / 100)
				if (shareFactor)
					p.forageConsumed += consumable
				else
					p.cforageConsumed += consumable
			}
			if (p.leafConsumed + p.cleafConsumed < p.leafNeed) {
				let consumable = Math.min(aPlot.lbiomass * aPlot.lconsumable / 100, p.leafNeed - p.leafConsumed - p.cleafConsumed)
				aPlot.livestock = Math.max(aPlot.livestock, consumable / leafPerHead)
				aPlot.lbiomass -= consumable
				aPlot.dung += consumable * (1 - globals.leafDigestibility / 100)
				if (shareFactor)
					p.leafConsumed += consumable
				else
					p.cleafConsumed += consumable
			}
			grazingPlots.splice(grazingPlots.indexOf(aPlot), 1)
		}
	}
	function productionUnitConsumeResidue(p, grazingPlots, residuePerHead, leafPerHead, shareFactor) {
		if (grazingPlots.length === 0 || p.residueNeed === 0 && p.leafNeed === 0)
			return;
		while (grazingPlots.length === 0 && (p.residueConsumed + p.cresidueConsumed < p.residueNeed || p.leafConsumed + p.cleafConsumed < p.leafNeed)) {
			let aPlot = grazingPlots[Math.trunc(Math.random() * grazingPlots.length)]
			if (p.residueConsumed + p.cresidueConsumed < p.residueNeed) {
				let consumable = Math.min(aPlot.gbiomass * aPlot.gconsumable / 100, p.residueNeed - p.residueConsumed - p.cresidueConsumed)
				aPlot.livestock = consumable / pasturePerHead
				aPlot.gbiomass -= consumable
				aPlot.dung += consumable * (1 - globals.residueDigestibility / 100)
				if (shareFactor)
					p.residueConsumed += consumable
				else
					p.cresidueConsumed += consumable
			}
			if (p.leafConsumed + p.cleafConsumed < p.leafNeed) {
				let consumable = Math.min(aPlot.lbiomass * aPlot.lconsumable / 100, p.leafNeed - p.leafConsumed - p.cleafConsumed)
				aPlot.livestock = Math.max(aPlot.livestock, consumable / leafPerHead)
				aPlot.lbiomass -= consumable
				aPlot.dung += consumable * (1 - globals.leafDigestibility / 100)
				if (shareFactor)
					p.leafConsumed += consumable
				else
					p.cleafConsumed += consumable
			}
			grazingPlots.splice(grazingPlots.indexOf(aPlot), 1)
		}
	}
	function productionUnitCattleFeed(p) {
		let cattleSize = p.males.sum() + p.females.sum()
		p.biomassNeed = (p.males.sum((c,age)=>c*globals.males[age].weight) + p.females.sum((c,age)=>c*globals.females[age].weight)) / 100 * globals.relativeBiomassNeed * 365
		if (p.biomassNeed <= 0)
			return;
		p.feedNeed = p.biomassNeed * globals.feed / 100
		p.pastureNeed = p.biomassNeed * globals.pasture / 100
		let pasturePerHead = p.pastureNeed / cattleSize
		p.residueNeed = p.biomassNeed * globals.residue / 100
		let residuePerHead = p.residueNeed / cattleSize
		p.leafNeed = p.biomassNeed * globals.leaf / 100
		let leafPerHead = p.leafNeed / cattleSize
		p.forageNeed = p.biomassNeed * globals.forage / 100
		let foragePerHead = p.forageNeed / cattleSize
		productionUnitConsumePasture(p, commonPlots.filter(a => a.livestock === 0 && ["grass", "sylvopastoralg"].includes(a.landCover)), pasturePerHead, leafPerHead, 0)
		productionUnitConsumePasture(p, p.plots.filter(a => a.livestock === 0 && ["grass", "sylvopastoralg"].includes(a.landCover)), pasturePerHead, leafPerHead, 1)
		p.forageNeed += p.pastureNeed - p.pastureConsumed - p.cpastureConsumed
		productionUnitConsumeForage(p, commonPlots.filter(a => a.livestock === 0 && ["forage", "sylvopastoralf"].includes(a.landCover)), foragePerHead, leafPerHead, 0)
		productionUnitConsumeForage(p, p.plots.filter(a => a.livestock === 0 && ["forage", "sylvopastoralf"].includes(a.landCover)), foragePerHead, leafPerHead, 1)
		p.residueNeed += p.forageNeed - p.forageConsumed - p.cforageConsumed
		productionUnitConsumeResidue(p, commonPlots.filter(a => a.livestock === 0 && ["crop", "agroforestry"].includes(a.landCover)), residuePerHead, leafPerHead, 0)
		productionUnitConsumeResidue(p, p.plots.filter(a => a.livestock === 0 && ["crop", "agroforestry"].includes(a.landCover)), residuePerHead, leafPerHead, 1)
		p.feedNeed = Math.max(0, p.feedNeed +
			(p.pastureNeed - p.pastureConsumed - p.cpastureConsumed) +
			(p.forageNeed - p.forageConsumed - p.cforageConsumed) +
			(p.residueNeed - p.residueConsumed - p.cresidueConsumed) +
			(p.leafNeed - p.leafConsumed - p.cleafConsumed))
		if (p.feedNeed) {
			let buy = Math.min(p.cash, p.feedNeed * globals.feedPrice)
			p.cash -= buy
			p.feedExpense += p.cash
			p.feedConsumed = buy / globals.feedPrice
		}
	}
	function productionUnitTransformation(p) {
		let UFL = (p.pastureConsumed + p.cpastureConsumed) * globals.grassKg2ufl +
		          (p.forageConsumed + p.cforageConsumed) * globals.forageKg2ufl +
		          (p.leafConsumed + p.cleafConsumed) * globals.leafKg2ufl +
		          (p.residueConsumed + p.cresidueConsumed) * globals.residueKg2ufl +
		          p.feedConsumed * globals.feedKg2ufl
		let nitrogen = (p.pastureConsumed + p.cpastureConsumed) * globals.grassKg2N +
		               (p.forageConsumed + p.cforageConsumed) * globals.forageKg2N +
		               (p.leafConsumed + p.cleafConsumed) * globals.leafKg2N +
		               (p.residueConsumed + p.cresidueConsumed) * globals.residueKg2N +
		               p.feedConsumed * globals.feedKg2N
		let maintenanceUFL = p.males.sum((c,age)=>c*globals.males[age].UFLm) + p.females.sum((c,age)=>c*globals.females[age].UFLm)
		let maintenanceN = p.males.sum((c,age)=>c*globals.males[age].Nm) + p.females.sum((c,age)=>c*globals.females[age].Nm)
		let cattleSize = p.males.sum() + p.females.sum()
		UFL -= maintenanceUFL
		nitrogen -= maintenanceN
		p.productionUFL = UFL / cattleSize
		if (UFL < 0) {
			p.starved = -UFL / maintenanceUFL / cattleSize
		} else if (nitrogen < 0) {
			p.starved = -nitrogen / maintenanceN / cattleSize
		} else {
			let milkingSize = p.females.slice(globals.milkingMinAge).sum()
			if (milkingSize > 0) {
				let prodFromUFL = UFL / cattleSize * globals.UFLPerLiter
				let prodFromN = nitrogen / cattleSize * globals.NPerLiter
				p.milkProduction = Math.min(prodFromUFL, prodFromN) * milkingSize
			}
		}
	}
	function productionUnitSellMilk(p) {
		if (globals.sharedMilkery && globals.milkeryMilk > 0) {
			p.cash += p.milkProduction * (globals.milkeryMilk / 100) * globals.diaryPrice - globals.milkeryContribution
			p.membershipExpense += globals.milkeryContribution
			p.tmilkIncome += p.milkProduction * (globals.milkeryMilk / 100) * globals.diaryPrice
		}
		if (globals.rawMilk > 0) {
			p.cash += p.milkProduction * (globals.rawMilk / 100) * globals.milkPrice
			p.rmilkIncome += p.milkProduction * (globals.rawMilk / 100) * globals.milkPrice
		}
		if (globals.processedMilk > 0) {
			p.cash += p.milkProduction * (globals.processedMilk / 100) * globals.diaryPrice
			p.tmilkIncome += p.milkProduction * (globals.processedMilk / 100) * globals.diaryPrice
		}
	}
	function productionUnitGrowCattle(p) {
		for (let [age, m] of Object.entries(globals.males)) {
			let mortality = m.mortality / 100
			if (age < globals.maleMax)
				p.death += mortality * p.males[age]
			p.males[age] = Math.max(0, p.males[age] * (1 - mortality) - p.starved / 2 / globals.maleMax)
		}
		let births = 0
		for (let [age, f] of Object.entries(globals.females)) {
			let mortality = f.mortality / 100
			if (age < globals.femaleMax)
				p.death += mortality * p.females[age]
			births += p.females[age] * f.fecundity
			p.females[age] = Math.max(0, p.females[age] * (1 - mortality) - p.starved / 2 / globals.femaleMax)
		}
		p.oldMaleKilled = p.males.pop()
		p.oldFemaleKilled = p.females.pop()
		p.males.unshift(births / 2)
		p.females.unshift(births / 2)
	}
	function productionUnitSellMeat(p) {
		p.killed = p.oldMaleKilled + p.oldFemaleKilled
		if (p.killed > 0) {
			if (globals.sharedSlaughterhouse && globals.shAnimal > 0) {
				p.cash += p.killed * globals.shAnimal / 100 * globals.meatPrice - globals.slaughterContribution
				p.membershipExpense += globals.slaughterContribution
				p.tmeatIncome += p.killed * globals.shAnimal / 100 * globals.meatPrice
			}
			if (globals.liveAnimal > 0) {
				p.cash += p.killed * globals.liveAnimal / 100 * globals.cowPrice
				p.rmeatIncome += p.killed * globals.liveAnimal / 100 * globals.cowPrice
			}
			if (globals.carcass > 0) {
				p.cash += p.killed * globals.carcass / 100 * globals.meatPrice
				p.tmeatIncome += p.killed * globals.carcass / 100 * globals.meatPrice
			}
		}
	}
	function productionUnitUpdateGazEmission(p) {
		let pastureDigested = (p.pastureConsumed + p.cpastureConsumed) * globals.grassOm / 100 * globals.grassDigestibility / 100
		let leafDigested = (p.leafConsumed + p.cleafConsumed) * globals.leafOm / 100 * globals.leafDigestibility / 100
		let residueDigested = (p.residueConsumed + p.cresidueConsumed) * globals.residueOm / 100 * globals.residueDigestibility / 100
		let feedDigested = p.feedConsumed * globals.feedOm / 100 * globals.feedDigestibility / 100
		p.co2Emission = p.males.sum((c,age)=>c*(globals.males[age].weight*globals.metabolicWeightRatio/100)**globals.f1) + p.females.sum((c,age)=>c*(globals.females[age].weight*globals.metabolicWeightRatio/100)**globals.f1) +
			(pastureDigested + leafDigested + residueDigested + feedDigested) ** globals.f2
	}



	// indicators
	function snapshot() {
		let res = {}
		
		// chart indicators
		res.averageGbiomass = usedPlots.sum(p=>p.gbiomass) / usedPlots.length
		res.averageLbiomass = usedPlots.sum(p=>p.lbiomass) / usedPlots.length
		res.averageTbiomass = usedPlots.sum(p=>p.tbiomass) / usedPlots.length
		res.averageWater = usedPlots.sum(p=>p.water) / usedPlots.length
		res.averageNutrient = usedPlots.sum(p=>p.soilN) / usedPlots.length
		res.averageFertilizer = productionUnits.sum(p=>p.boughtFertilizer) / productionUnits.length
		res.averageManure = usedPlots.sum(p=>p.livestock*globals.livestock2N) / usedPlots.length
		let cattlePlots = usedPlots.filter(p=>p.livestock>0)
		res.grassLivestock = cattlePlots.sum(p=>p.landCover==="grass") * globals.plotSurface
		res.cropLivestock = cattlePlots.sum(p=>p.landCover==="crop") * globals.plotSurface
		res.forageLivestock = cattlePlots.sum(p=>p.landCover==="forage") * globals.plotSurface
		res.agroforestryLivestock = cattlePlots.sum(p=>p.landCover==="agroforestry") * globals.plotSurface
		res.sylvopastoralgLivestock = cattlePlots.sum(p=>p.landCover==="sylvopastoralg") * globals.plotSurface
		res.sylvopastoralfLivestock = cattlePlots.sum(p=>p.landCover==="sylvopastoralf") * globals.plotSurface
		res.totalCSequestration = usedPlots.sum(p=>p.soilC) / 1000
		res.totalPlotEmission = usedPlots.sum(p=>p.gazEmission) / 1000
		res.totalProductionUnitEmission = productionUnits.sum(p=>p.co2Emission) / 1000
		res.averageMaleBorn = productionUnits.sum(p=>p.males[0]) / productionUnits.length
		res.averageFemaleBorn = productionUnits.sum(p=>p.females[0]) / productionUnits.length
		res.averageMaleYoung = productionUnits.sum(p=>p.males.sum((c,age)=>globals.males[age].class==="young"?c:0)) / productionUnits.length
		res.averageMaleSubadult = productionUnits.sum(p=>p.males.sum((c,age)=>globals.males[age].class==="subadult"?c:0)) / productionUnits.length
		res.averageMaleAdult = productionUnits.sum(p=>p.males.sum((c,age)=>globals.males[age].class==="adult"?c:0)) / productionUnits.length
		res.averageFemaleYoung = productionUnits.sum(p=>p.females.sum((c,age)=>globals.females[age].class==="young"?c:0)) / productionUnits.length
		res.averageFemaleSubadult = productionUnits.sum(p=>p.females.sum((c,age)=>globals.females[age].class==="subadult"?c:0)) / productionUnits.length
		res.averageFemaleAdult = productionUnits.sum(p=>p.females.sum((c,age)=>globals.females[age].class==="adult"?c:0)) / productionUnits.length
		res.averageCattle = res.averageMaleYoung + res.averageFemaleYoung +
		                    res.averageMaleSubadult + res.averageFemaleSubadult +
		                    res.averageMaleAdult + res.averageFemaleAdult
		res.averageDeath = productionUnits.sum(p=>p.death) / productionUnits.length
		res.averageStarved = productionUnits.sum(p=>p.starved) / productionUnits.length
		res.averageKilled = productionUnits.sum(p=>p.killed) / productionUnits.length
		res.averageLiveSold = res.averageKilled * globals.liveAnimal / 100
		res.averageCarcassSold = res.averageKilled * globals.carcass / 100
		res.averageShSold = res.averageKilled * globals.shAnimal / 100
		res.averageBiomassNeed = productionUnits.sum(p=>p.biomassNeed) / productionUnits.length
		res.averagePastureNeed = productionUnits.sum(p=>p.pastureNeed) / productionUnits.length
		res.averageResidueNeed = productionUnits.sum(p=>p.residueNeed) / productionUnits.length
		res.averageLeafNeed = productionUnits.sum(p=>p.leafNeed) / productionUnits.length
		res.averageFeedNeed = productionUnits.sum(p=>p.feedNeed) / productionUnits.length
		res.averageForageNeed = productionUnits.sum(p=>p.forageNeed) / productionUnits.length
		res.averagePastureConsumed = productionUnits.sum(p=>p.pastureConsumed) / productionUnits.length
		res.averageResidueConsumed = productionUnits.sum(p=>p.residueConsumed) / productionUnits.length
		res.averageLeafConsumed = productionUnits.sum(p=>p.leafConsumed) / productionUnits.length
		res.averageForageConsumed = productionUnits.sum(p=>p.forageConsumed) / productionUnits.length
		res.averageCpastureConsumed = productionUnits.sum(p=>p.cpastureConsumed) / productionUnits.length
		res.averageCresidueConsumed = productionUnits.sum(p=>p.cresidueConsumed) / productionUnits.length
		res.averageCleafConsumed = productionUnits.sum(p=>p.cleafConsumed) / productionUnits.length
		res.averageCforageConsumed = productionUnits.sum(p=>p.cforageConsumed) / productionUnits.length
		res.averageFeedConsumed = productionUnits.sum(p=>p.feedConsumed) / productionUnits.length
		res.averageProductionUfl = productionUnits.sum(p=>p.productionUfl) / productionUnits.length
		res.averageMilkProduction = productionUnits.sum(p=>p.milkProduction) / productionUnits.length
		res.averageRmilkSold = res.averageMilkProduction * globals.rawMilk / 100
		res.averagePmilkSold = res.averageMilkProduction * globals.processedMilk / 100
		res.averageMmilkSold = res.averageMilkProduction * globals.milkeryMilk / 100
		res.averageAmilk = res.averageMilkProduction - res.averageRmilkSold - res.averagePmilkSold - res.averageMmilkSold
		res.averageCash = productionUnits.sum(p=>p.cash) / productionUnits.length
		res.averageRmilkIncome = productionUnits.sum(p=>p.rmilkIncome) / productionUnits.length
		res.averageTmilkIncome = productionUnits.sum(p=>p.tmilkIncome) / productionUnits.length
		res.averageRmeatIncome = productionUnits.sum(p=>p.rmeatIncome) / productionUnits.length
		res.averageTmeatIncome = productionUnits.sum(p=>p.tmeatIncome) / productionUnits.length
		res.averageResidueExpense = productionUnits.sum(p=>p.residueExpense) / productionUnits.length
		res.averageFeedExpense = productionUnits.sum(p=>p.feedExpense) / productionUnits.length
		res.averageFertilizerExpense = productionUnits.sum(p=>p.fertilizerExpense) / productionUnits.length
		res.averageMembershipExpense = productionUnits.sum(p=>p.membershipExpense) / productionUnits.length
		res.averageIncome = res.averageRmilkIncome + res.averageTmilkIncome + res.averageRmeatIncome + res.averageTmeatIncome
		res.averageExpense = res.averageResidueExpense + res.averageFeedExpense + res.averageFertilizerExpense + res.averageMembershipExpense
		res.nbSsEmployee = (globals.rawMilk + globals.processedMilk + globals.milkeryMilk) / 10
		res.nbInEmployee = (globals.milkeryMilk + globals.shAnimal) / 15 * 3
		
		// canvas textures
		let maxWater = Math.max(...usedPlots.map(p=>p.water))
		let maxNutrient = Math.max(...usedPlots.map(p=>p.soilN))
		let maxC = Math.max(...usedPlots.map(p=>p.soilC))
		let maxGbiomass = Math.max(...usedPlots.map(p=>p.gbiomass))
		let maxLbiomass = Math.max(...usedPlots.map(p=>p.lbiomass))
		let maxTbiomass = Math.max(...usedPlots.map(p=>p.tbiomass))
		let maxDung = Math.max(...usedPlots.map(p=>p.dung))
		res.cover = ctx.createImageData(canvas.width, canvas.height)
		res.water = ctx.createImageData(canvas.width, canvas.height)
		res.nutrient = ctx.createImageData(canvas.width, canvas.height)
		res.gbiomass = ctx.createImageData(canvas.width, canvas.height)
		res.lbiomass = ctx.createImageData(canvas.width, canvas.height)
		res.tbiomass = ctx.createImageData(canvas.width, canvas.height)
		res.livestock = ctx.createImageData(canvas.width, canvas.height)
		res.dung = ctx.createImageData(canvas.width, canvas.height)
		res.soilC = ctx.createImageData(canvas.width, canvas.height)
		res.gazEmission = ctx.createImageData(canvas.width, canvas.height)
		for (let p of patches) {
			let i = (p.y * width + p.x) * 4
			res.cover.data[i    ] = p.color.r
			res.cover.data[i + 1] = p.color.g
			res.cover.data[i + 2] = p.color.b
			res.cover.data[i + 3] = 255
			res.water.data[i    ] = 52
			res.water.data[i + 1] = 93
			res.water.data[i + 2] = 169
			res.water.data[i + 3] = 255 * p.water / maxWater
			res.nutrient.data[i    ] = 157
			res.nutrient.data[i + 1] = 110
			res.nutrient.data[i + 2] = 72
			res.nutrient.data[i + 3] = 255 * p.soilN / maxNutrient
			res.gbiomass.data[i    ] = 89
			res.gbiomass.data[i + 1] = 176
			res.gbiomass.data[i + 2] = 61
			res.gbiomass.data[i + 3] = 255 * p.gbiomass / maxGbiomass
			res.lbiomass.data[i    ] = 89
			res.lbiomass.data[i + 1] = 176
			res.lbiomass.data[i + 2] = 61
			res.lbiomass.data[i + 3] = 255 * p.lbiomass / maxLbiomass
			res.tbiomass.data[i    ] = 157
			res.tbiomass.data[i + 1] = 110
			res.tbiomass.data[i + 2] = 72
			res.tbiomass.data[i + 3] = 255 * p.tbiomass / maxTbiomass
			res.livestock.data[i    ] = 124
			res.livestock.data[i + 1] = 80
			res.livestock.data[i + 2] = 164
			res.livestock.data[i + 3] = 255 * p.livestock / 3
			res.dung.data[i    ] = 157
			res.dung.data[i + 1] = 110
			res.dung.data[i + 2] = 72
			res.dung.data[i + 3] = 255 * p.dung / maxDung
			res.soilC.data[i    ] = 0
			res.soilC.data[i + 1] = 0
			res.soilC.data[i + 2] = 0
			res.soilC.data[i + 3] = 255 * p.soilC / 50
			res.gazEmission.data[i    ] = 0
			res.gazEmission.data[i + 1] = 0
			res.gazEmission.data[i + 2] = 0
			res.gazEmission.data[i + 3] = 255 * p.gazEmission / 400
		}
		return res
	}



	// exécution de la simulation
	let snapshots = []
	globals.pluviometry = Object.values(globals.seasons)[Math.trunc(Math.random() * 3)]
	environmentComputeBiomass()
	for (let i=0; i<iterations; i++) {
		resetSynchronousStateVariables()
		if (chk_env_nutrient.checked)
			environmentUpdateNutrient()
		if (chk_prod_fertilization.checked) for (let p of productionUnits)
			productionUnitDecideFertilization(p)
		if (chk_env_biomass.checked)
			environmentComputeBiomass()
		if (chk_prod_feed.checked) for (let p of productionUnits)
			productionUnitCattleFeed(p)
		for (let p of productionUnits) {
			if (chk_prod_transformation.checked)
				productionUnitTransformation(p)
			if (chk_prod_milk.checked)
				productionUnitSellMilk(p)
			if (chk_prod_cattle.checked)
				productionUnitGrowCattle(p)
			if (chk_prod_meat.checked)
				productionUnitSellMeat(p)
			if (chk_prod_gaz.checked)
				productionUnitUpdateGazEmission(p)
		}
		if (chk_env_water.checked)
			environmentUpdateWater()
		if (chk_env_carbon.checked)
			environmentUpdateCarbon()
		if (chk_env_gaz.checked)
			environmentUpdateGazEmission()
		snapshots.push(snapshot())
		globals.pluviometry = Object.values(globals.seasons)[Math.trunc(Math.random() * 3)]
	}
	return {canvas, snapshots}
}
