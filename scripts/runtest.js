"use strict";

Object.assign(global, require("./neuromodule"));

function log(obj) {
    console.log(obj);
    //document.body.innerHTML += obj + '<br>';
}

function pickByTournament(scores) {
    let size = scores.length;
    let fighter1 = Math.floor(Math.random() * size);
    let fighter2 = Math.floor(Math.random() * size);
    return scores[fighter1] >= scores[fighter2] ? fighter1 : fighter2;
}

function breedByCrossover(parent1, parent2) {
    let child1 = parent1.clone();
    let child2 = parent2.clone();
    for(let i = 0; i < parent1.layers.length; i++) {
        for(let j = 0; j < parent1.layers[i].length; j++) {
            if(Math.random() > 0.5) {
                // Swap weights
                [child1.layers[i][j].bias, child2.layers[i][j].bias] = [child2.layers[i][j].bias, child1.layers[i][j].bias];
            }
        }
    }
    for(let i = 0; i < parent1.weights.length; i++) {
        for(let j = 0; j < parent1.weights[i].length; j++) {
            for(let k = 0; k < parent1.weights[i][j].length; k++) {
                if(Math.random() > 0.5) {
                    // Swap weights
                    [child1.weights[i][j][k], child2.weights[i][j][k]] = [child2.weights[i][j][k], child1.weights[i][j][k]];
                }
            }
        }
    }
    return [child1, child2];
}

function mutatePopulation(population, rate) {
    let count = 0;
    population.forEach(function(ind) {
        for(let i = 0; i < ind.layers.length; i++) {
            for(let j = 0; j < ind.layers[i].length; j++) {
                if(Math.random() > rate)
                    continue;
                count++;
                // Random weight mutation
                // TODO: May be add?
                ind.layers[i][j].bias = Math.random() * 2 - 1;
            }
        }
        for(let i = 0; i < ind.weights.length; i++) {
            for(let j = 0; j < ind.weights[i].length; j++) {
                for(let k = 0; k < ind.weights[i][j].length; k++) {
                    if(Math.random() > rate)
                        continue;
                    count++;
                    // Random weight mutation
                    // TODO: May be add?
                    ind.weights[i][j][k] = Math.random() * 2 - 1;
                }
            }
        }
    });
    //log(`Total mutations: ${count}`);
}

var pool = [];
for(let i = 0; i < 100; i++) {
    pool.push(new ANNetwork([2, 2, 1]));
}

function getScores(population) {
    //let inputs = [Math.random() * 2 - 1, Math.random() * 2 - 1];
    //let target = (inputs[0] + inputs[1]) * 0.5;
    return population.map(function(ind) {
        //return 1 - Math.abs(ind.getOutputs(inputs)[0] - target);
        let fitness = 0;
        // const numTests = 100;
        // for(let i = 0; i < numTests; i++) {
        // let inputs = [Math.random() * 2 - 1, Math.random() * 2 - 1];
        // let target = (inputs[0] + inputs[1]) * 0.5;
        // fitness += 1 - Math.abs(ind.getOutputs(inputs)[0] - target);
        // }
        for(let i = 0; i <= 1; i += 0.1) {
            for(let j = 0; j <= 1; j += 0.1) {
                let inputs = [i, j];
                let target = (inputs[0] + inputs[1]) * 0.5;
                //log(`${ind.getOutputs(inputs)[0]} ${target}`);
                fitness += 1 - Math.abs(ind.getOutputs(inputs)[0] - target);
            }
        }
        return fitness / 121;
    });
}

function evolve() {
    log("Evolving...");
    for(let generation = 0; generation < 10000; generation++) {
        let scores = getScores(pool);
        let bestScore = -Infinity;
        let averageScore = 0;
        let leader;
        for(let i = 0; i < scores.length; i++) {
            averageScore += scores[i];
            if(scores[i] <= bestScore)
                continue;
            bestScore = scores[i];
            leader = i;
        }
        averageScore /= scores.length;
        if(generation % 1000 == 0)
            log(`Generation: ${generation}; Best: ${bestScore} (${leader}); Average: ${averageScore}`);
        let newPool = [];
        // Breed
        for(let i = 0; i < pool.length / 2 - 1; i++) {
            // Append array of 2 children to population
            newPool.push.apply(newPool, breedByCrossover(
                pool[pickByTournament(scores)],
                pool[pickByTournament(scores)]
            ));
        }
        mutatePopulation(newPool, 0.1);
        newPool.push(pool[leader]); // The best hero reincarnation (last hope)
        newPool.push(new ANNetwork([2, 2, 1])); // Supermutant alien (new blood)
        pool = newPool;
        //log(pool);
    }
    let scores = getScores(pool);
    let bestScore = -Infinity;
    let averageScore = 0;
    let leader;
    for(let i = 0; i < scores.length; i++) {
        averageScore += scores[i];
        if(scores[i] <= bestScore)
            continue;
        bestScore = scores[i];
        leader = i;
    }
    averageScore /= scores.length;
    //log(`Final best score: ${Math.max.apply(null, scores)}`);
    log(`Best: ${bestScore} (${leader}); Average: ${averageScore}`);
    //log(scores);
    log(pool[leader].weights);
    log(pool[leader].layers)
}

evolve();