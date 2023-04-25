//TODO: when a territory changes, check it against currently selected cell to see if we need to handle that weird situation

const playerNum = 1;

const playerCells = [[],[],[],[],[]];

let gameRunning = false;
let spawnTimer;
let AITimer;

const maxPerCell = 999;
const dimension = 6;
let selectingCell = null;
let attackableCells = [];
let movableCells = [];

class Cell {
    constructor(domCell, controllingPlayer, x, y) {
        this.domCell = domCell;
        this.setToPlayer(controllingPlayer);
        this.x = x;
        this.y = y;
        this.spawnRate = 5;

        this.outer = false;

        this.neighbors = [];

        this.units = 0;
        this.domCell.onclick = e => {
            if(!gameRunning) { return; }

            //run block if we are clicking a cell while already having selected one
            if(selectingCell) {
                //if clicking the same one as selected, stop selecting
                if(this === selectingCell) {
                    StopSelecting();
                    return;
                }

                //if targeting an attackable cell, resolve attack
                if(attackableCells.includes(this)) {
                    this.getAttacked(selectingCell);
                }

                //handle move units
                if(movableCells.includes(this)) {
                    let moveUnits = Math.ceil(selectingCell.units / 2);
                    this.getUnitsFrom(selectingCell, moveUnits);
                }

                //end selection now that we've done an action
                StopSelecting();
                return;
            }

            //reset all select data just in case
            StopSelecting();

            //set currently selected cell if player owns it, otherwise bail
            if(this.controllingPlayer === playerNum) {
                selectingCell = this;
                this.domCell.classList.add('selected');
            } else {
                return;
            }

            //set cells that can be attacked to left/right/up/down cells that are a different player than this one
            this.neighbors.forEach(neighbor => {
                if(neighbor.controllingPlayer != this.controllingPlayer) {
                    neighbor.domCell.classList.add('attackable');
                    attackableCells.push(neighbor);
                }
            });

            //recursive function to crawl from current spot to find all ATTACHED friendly cells
            const addConnectedNeighbors = (X,Y) => {
                //for each direction, if that cell exists AND is friendly AND is not already in movableCells, add it AND its neighbors
                grid[X][Y].neighbors.forEach(neighbor => {
                    if(neighbor.controllingPlayer === this.controllingPlayer && !movableCells.includes(neighbor)) {
                        neighbor.domCell.classList.add('movable');
                        movableCells.push(neighbor);
                        addConnectedNeighbors(neighbor.x,neighbor.y);
                    }
                });
            };

            //call recursive crawl starting at this spot
            addConnectedNeighbors(this.x, this.y);

            //find this cell in movableCells and remove it - it should have been added in recursion unless there are no connections
            const ind = movableCells.indexOf(this);
            this.domCell.classList.remove('movable');
            if(ind >= 0) { movableCells.splice(ind,1); }
        };
    }

    initializeNeighbors() {
        this.neighbors = [];
        if(grid[this.x+1] && grid[this.x+1][this.y]) { this.neighbors.push(grid[this.x+1][this.y]); }
        if(grid[this.x-1] && grid[this.x-1][this.y]) { this.neighbors.push(grid[this.x-1][this.y]); }
        if(grid[this.x][this.y+1]) { this.neighbors.push(grid[this.x][this.y+1]); }
        if(grid[this.x][this.y-1]) { this.neighbors.push(grid[this.x][this.y-1]); }
    }

    updateOuterness() {
        this.outer = false;
        this.neighbors.forEach(neighbor => {
            if(neighbor.controllingPlayer != this.controllingPlayer) {
                this.outer = true;
            }
        });
    }

    spawn() {
        this.addUnits(this.spawnRate);
    }

    setToPlayer(num) {
        if(num < 0 || num > 4 || this.controllingPlayer === num) { return; }

        //clear any other player number class that might be set
        this.domCell.classList.remove('player0cell');
        this.domCell.classList.remove('player1cell');
        this.domCell.classList.remove('player2cell');
        this.domCell.classList.remove('player3cell');
        this.domCell.classList.remove('player4cell');

        //move this from one players cell array to the other
        if(playerCells[this.controllingPlayer]) {
            let ind = playerCells[this.controllingPlayer].indexOf(this);
            if(ind >= 0) { playerCells[this.controllingPlayer].splice(ind,1); }
        }
        playerCells[num].push(this);

        this.controllingPlayer = num;
        this.domCell.classList.add('player' + num + 'cell');

        //IF game is running, check if game is over and update outerness
        if(gameRunning) {
            //check number of living players to see if game is over
            let livingPlayers = 0;
            let lastPlayer = 0;
            for(let i = 1; i < playerCells.length; i++) {
                if(playerCells[i].length > 0) {
                    ++livingPlayers;
                    lastPlayer = i;
                }
            }
            if(livingPlayers === 0) {
                console.log('No players alive?!?');
                EndGame();
                return;
            } else if(livingPlayers === 1) {
                EndGame(lastPlayer);
                return;
            }

            //update outerness of this cell and its neighbors
            this.updateOuterness();
            this.neighbors.forEach(neighbor => {
                neighbor.updateOuterness();
            });
        }
    }

    getAttacked(byCell) {
        if(this.units > byCell.units) {
            this.units -= byCell.units;
            byCell.units = 0;
        } else if(this.units == byCell.units) {
            this.units = 0;
            byCell.units = 0;
        } else {
            let totalUnits = byCell.units - this.units;
            byCell.units = Math.floor(totalUnits / 2);
            this.units = totalUnits - byCell.units;
            this.setToPlayer(byCell.controllingPlayer);
        }
        this.updateRender();
        byCell.updateRender();
    }

    getUnitsFrom(sourceCell, num) {
        if(num > sourceCell.units) { num = sourceCell.units; }
        if(num > maxPerCell - this.units) { num = maxPerCell - this.units; }
        if(num <= 0) { return; }
        if(sourceCell.units > 0) {
            this.addUnits(num);
            sourceCell.units -= num;
        }
        this.updateRender();
        sourceCell.updateRender();
    }

    addUnits(num) {
        this.units += num;
        if(this.units > maxPerCell) { this.units = maxPerCell; }
        this.updateRender();
    }

    updateRender() {
        this.domCell.textContent = this.units;
    }
}

//Right click anywhere on page leaves selecting mode
document.querySelector('body').onclick += e => { StopSelecting(); }

const grid = [];
for(let i = 0; i < dimension; i++) { grid.push([]); }

const table = document.createElement('table');
for(let i = 0; i < dimension; i++) {
    const row = document.createElement('tr');
    for(let j = 0; j < dimension; j++) {
        const cell = document.createElement('td');
        grid[j].push(new Cell(cell, 0, j, i));
        row.appendChild(cell);
    }
    table.appendChild(row);
}
document.querySelector('#gamearea').appendChild(table);

grid.forEach(arr => {
    arr.forEach(cell => {
        cell.initializeNeighbors();
        cell.addUnits(Math.ceil(Math.random() * 100));
    });
});

//randomize corners to each player
const pnums = [];
for(let i = 1; i <= 4; i++) {
    let rn = Math.ceil(Math.random() * 4);
    while(pnums.includes(rn)) {
        rn = Math.ceil(Math.random() * 4);
    }
    pnums.push(rn);
}
grid[dimension-1][dimension-1].setToPlayer(pnums[0]);
grid[0][dimension-1].setToPlayer(pnums[1]);
grid[dimension-1][0].setToPlayer(pnums[2]);
grid[0][0].setToPlayer(pnums[3]);

//set initial outerness of spawn points and their neighbors
grid[dimension-1][dimension-1].outer = true;
grid[dimension-2][dimension-1].outer = true;
grid[dimension-1][dimension-2].outer = true;
grid[0][dimension-1].outer = true;
grid[1][dimension-1].outer = true;
grid[0][dimension-2].outer = true;
grid[dimension-1][0].outer = true;
grid[dimension-2][0].outer = true;
grid[dimension-1][1].outer = true;
grid[0][0].outer = true;
grid[1][0].outer = true;
grid[0][1].outer = true;

//spawn timer for new units
spawnTimer = setInterval(()=>{
    grid.forEach(row => {
        row.forEach(cell => {
            if(cell.controllingPlayer !== 0) {
                cell.spawn();
            }
        });
    });
},5000);

//AI logic on a timer
AITimer = setInterval(()=>{
    //for each player that isn't ours, go through all OUTER cells and store all possible attacks and which needs reinforcements the most
    for(let plyr = 1; plyr < playerCells.length; plyr++) {
        const possiblePlayerAttacks = [];
        const possibleNeutralAttacks = [];
        let mostNeededTroops = { found:false, againstPlayer:false, num:0, x:-1, y:-1 };

        if(plyr !== playerNum) {
            for(let i = 0; i < playerCells[plyr].length; i++) {
                const currentCell = playerCells[plyr][i];
                if(currentCell.outer) {
                    currentCell.neighbors.forEach(neighbor => {
                        if(neighbor.controllingPlayer !== currentCell.controllingPlayer && neighbor.controllingPlayer !== 0) {
                            //this neighbor is an enemy player
                            if(neighbor.units < currentCell.units) {
                                possiblePlayerAttacks.push({ myX:currentCell.x, myY:currentCell.y, theirX:neighbor.x, theirY:neighbor.y });
                            } else {
                                if(!mostNeededTroops.found || (!mostNeededTroops.againstPlayer || mostNeededTroops.num < neighbor.units - currentCell.units)) {
                                    mostNeededTroops = { found:true, againstPlayer:true, num:neighbor.units - currentCell.units, x:currentCell.x, y:currentCell.y };
                                }
                            }
                        } else if(neighbor.controllingPlayer !== currentCell.controllingPlayer) {
                            //this neighbor is neutral
                            if(neighbor.units < currentCell.units) {
                                possibleNeutralAttacks.push({ myX:currentCell.x, myY:currentCell.y, theirX:neighbor.x, theirY:neighbor.y });
                            } else {
                                if(!mostNeededTroops.found || (!mostNeededTroops.againstPlayer && mostNeededTroops.num < neighbor.units - currentCell.units)) { 
                                    mostNeededTroops = { found:true, againstPlayer:false, num:neighbor.units - currentCell.units, x:currentCell.x, y:currentCell.y };
                                }
                            }
                        }
                    });
                }
            }

            if(possiblePlayerAttacks.length > 0) {
                let attack = possiblePlayerAttacks[Math.floor(Math.random() * possiblePlayerAttacks.length)];
                grid[attack.theirX][attack.theirY].getAttacked(grid[attack.myX][attack.myY]);
            } else if(possibleNeutralAttacks.length > 0) {
                let attack = possibleNeutralAttacks[Math.floor(Math.random() * possiblePlayerAttacks.length)];
                grid[attack.theirX][attack.theirY].getAttacked(grid[attack.myX][attack.myY]);
            } else if(mostNeededTroops.found) {
                let index = -1;
                let max = -1;
                for(let i = 0; i < playerCells[plyr].length; i++) {
                    if(!playerCells[plyr][i].outer) {
                        let count = playerCells[plyr][i].units;
                        if(count > max) {
                            max = count;
                            index = i;
                        }
                    }
                }
                if(index >= 0) {
                    grid[mostNeededTroops.x][mostNeededTroops.y].getUnitsFrom(playerCells[plyr][index], Math.ceil(playerCells[plyr][index].units / 2));
                }
            }
        }
    }
},2000);

gameRunning = true;

//function that disposes select mode
function StopSelecting() {
    attackableCells.forEach(cell => {
        cell.domCell.classList.remove('attackable');
    });
    movableCells.forEach(cell => {
        cell.domCell.classList.remove('movable');
    });
    if(selectingCell) { selectingCell.domCell.classList.remove('selected'); }

    selectingCell = null;
    attackableCells = [];
    movableCells = [];
}

//end timers and handle game ending
function EndGame(winningPlayerNumber) {
    clearInterval(spawnTimer);
    clearInterval(AITimer);

    gameRunning = false;

    if(winningPlayerNumber) {
        console.log('Player ' + winningPlayerNumber + ' won!');
    }
}

