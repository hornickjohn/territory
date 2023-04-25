const playerNum = 1;

const playerLands = [0,0,0,0,0];

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
            if(grid[this.x+1] && grid[this.x+1][this.y] && grid[this.x+1][this.y].controllingPlayer != this.controllingPlayer) { 
                grid[this.x+1][this.y].domCell.classList.add('attackable');
                attackableCells.push(grid[this.x+1][this.y]); 
            }
            if(grid[this.x-1] && grid[this.x-1][this.y] && grid[this.x-1][this.y].controllingPlayer != this.controllingPlayer) {
                grid[this.x-1][this.y].domCell.classList.add('attackable');
                attackableCells.push(grid[this.x-1][this.y]);
            }
            if(grid[this.x][this.y+1] && grid[this.x][this.y+1].controllingPlayer != this.controllingPlayer) {
                grid[this.x][this.y+1].domCell.classList.add('attackable');
                attackableCells.push(grid[this.x][this.y+1]);
            }
            if(grid[this.x][this.y-1] && grid[this.x][this.y-1].controllingPlayer != this.controllingPlayer) {
                grid[this.x][this.y-1].domCell.classList.add('attackable');
                attackableCells.push(grid[this.x][this.y-1]);
            }

            //recursive function to crawl from current spot to find all ATTACHED friendly cells
            const addConnectedNeighbors = (X,Y) => {
                //for each direction, if that cell exists AND is friendly AND is not already in movableCells, add it AND its neighbors
                if(grid[X+1] && grid[X+1][Y] && grid[X+1][Y].controllingPlayer == this.controllingPlayer && !movableCells.includes(grid[X+1][Y])) {
                    grid[X+1][Y].domCell.classList.add('movable');
                    movableCells.push(grid[X+1][Y]);
                    addConnectedNeighbors(X+1,Y);
                }
                if(grid[X-1] && grid[X-1][Y] && grid[X-1][Y].controllingPlayer == this.controllingPlayer && !movableCells.includes(grid[X-1][Y])) {
                    grid[X-1][Y].domCell.classList.add('movable');
                    movableCells.push(grid[X-1][Y]);
                    addConnectedNeighbors(X-1,Y);
                }
                if(grid[X][Y+1] && grid[X][Y+1].controllingPlayer == this.controllingPlayer && !movableCells.includes(grid[X][Y+1])) {
                    movableCells.push(grid[X][Y+1]);
                    grid[X][Y+1].domCell.classList.add('movable');
                    addConnectedNeighbors(X,Y+1);
                }
                if(grid[X][Y-1] && grid[X][Y-1].controllingPlayer == this.controllingPlayer && !movableCells.includes(grid[X][Y-1])) {
                    grid[X][Y-1].domCell.classList.add('movable');
                    movableCells.push(grid[X][Y-1]);
                    addConnectedNeighbors(X,Y-1);
                }
            };

            //call recursive crawl starting at this spot
            addConnectedNeighbors(this.x, this.y);

            //find this cell in movableCells and remove it - it should have been added in recursion unless there are no connections
            const ind = movableCells.indexOf(this);
            if(ind >= 0) { movableCells.splice(ind,1); }
        };

        //domCell.style.backgroundColor = 'black';  
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

        playerLands[this.controllingPlayer]--;
        playerLands[num]++;
        console.log(playerLands);

        this.controllingPlayer = num;
        this.domCell.classList.add('player' + num + 'cell');

        if(gameRunning) {
            let livingPlayers = 0;
            let lastPlayer = 0;
            for(let i = 1; i < playerLands.length; i++) {
                if(playerLands[i] > 0) {
                    ++livingPlayers;
                    lastPlayer = i;
                }
            }
            if(livingPlayers === 0) {
                console.log('No players alive?!?');
                EndGame();
            } else if(livingPlayers === 1) {
                EndGame(lastPlayer);
            }
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

},5000);

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

