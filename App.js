import * as React from 'react';
import 'react-native-gesture-handler';
import {
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NavigationContainer, useFocusEffect} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

const FIELD_HEIGHT = 8;
const FIELD_WIDTH = 8;

const GAME_START_DELAY = 1000;
const COMPUTER_DELAY = 500;

const PLAYER1 = 'P1'; // 1
const PLAYER2 = 'P2'; // 2
const EMPTY_CELL = 'EM'; // 3
const AVAILABLE_CELL = 'AV'; // 4

const GAME_NONE = 'Game None'; // 5
const GAME_IN_PROGRESS = 'Game In Progress'; // 6
const GAME_FINISH = 'Game Finish'; // 7

const GAME_MODE_NONE = 'Game Mode None'; // 8
const GAME_MODE_EASY_PC = 'Game Mode Easy PC'; // 9
const GAME_MODE_HARD_PC = 'Game Mode Hard PC'; //  10
const GAME_MODE_PLAYER = 'Game Mode Player'; // 11

const CELL_OFFSETS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
];

const storeData = async value => {
  try {
    await AsyncStorage.setItem('@best_score', value);
  } catch (e) {
    // saving error
  }
};

const getData = async () => {
  try {
    const value = await AsyncStorage.getItem('@best_score');
    if (value !== null) {
      return value;
    }
  } catch (e) {
    // error reading value
  }
};

const clone = items =>
  items.map(item => (Array.isArray(item) ? clone(item) : item));

function isIndexValid(grid, i, j) {
  return i >= 0 && j >= 0 && i < grid.length && j < grid[i].length;
}

function getTitleText(gameState) {
  switch (gameState.gameStatus) {
    case GAME_NONE:
      return <Text>Warming up the CPU...</Text>;
    case GAME_IN_PROGRESS:
      return (
        <Text>
          <Text>
            <Text style={{color: getCellColorFor(gameState.currentPlayer)}}>
              {gameState.currentPlayer}
            </Text>{' '}
            is making a move{'\n'}
          </Text>
          <Text>
            Current score is{' '}
            <Text style={{color: getCellColorFor(PLAYER1)}}>
              {gameState.score.PLAYER1}
            </Text>
            {' : '}
            <Text style={{color: getCellColorFor(PLAYER2)}}>
              {gameState.score.PLAYER2}
            </Text>
          </Text>
        </Text>
      );
    case GAME_FINISH:
      const p1Score = gameState.score.PLAYER1;
      const p2Score = gameState.score.PLAYER2;
      let topMessage;
      if (p1Score === p2Score) {
        topMessage = "It's a Draw!\n";
      } else if (p1Score > p2Score) {
        topMessage = (
          <Text>
            <Text
              style={{
                color: getCellColorFor(PLAYER1),
              }}>
              Player 1
            </Text>{' '}
            wins!{'\n'}
          </Text>
        );
      } else {
        topMessage = (
          <Text>
            <Text
              style={{
                color: getCellColorFor(PLAYER2),
              }}>
              Player 2
            </Text>{' '}
            wins!{'\n'}
          </Text>
        );
      }
      return (
        <Text>
          <Text>{topMessage}</Text>
          <Text>
            Final Score is{' '}
            <Text style={{color: getCellColorFor(PLAYER1)}}>
              {gameState.score.PLAYER1}
            </Text>
            {' : '}
            <Text style={{color: getCellColorFor(PLAYER2)}}>
              {gameState.score.PLAYER2}
            </Text>
          </Text>
        </Text>
      );
  }
}

function isCellOnBorder(grid, i, j) {
  return (
    i === 0 || i === grid.length - 1 || j === 0 || j === grid[i].length - 1
  );
}

function isCellOnCorner(grid, i, j) {
  return (
    (i === 0 && j === 0) ||
    (i === 0 && j === grid[i].length - 1) ||
    (i === grid.length - 1 && j === 0) ||
    (i === grid.length - 1 && j === grid[i].length - 1)
  );
}

function R(grid, player) {
  let possibleMoves = [];
  forEachElementInGridWhileReturnFalse(grid, (i, j, val) => {
    if (val === AVAILABLE_CELL) {
      // console.log(i + ' ' + j + ' ' + val);
      const obtainedCells = obtainCells(grid, i, j, player);
      const scoreForObtainedCells =
        obtainedCells.reduce((prev, curr) => {
          return prev + (isCellOnBorder(grid, curr[0], curr[1]) ? 2 : 1);
        }, 0) +
        (isCellOnCorner(grid, i, j)
          ? 0.8
          : isCellOnBorder(grid, i, j)
          ? 0.4
          : 0);
      // console.log(obtainedCells + ', ' + scoreForObtainedCells);
      possibleMoves.push({
        chosenCell: [i, j],
        obtainedCells: obtainedCells,
        score: scoreForObtainedCells,
      });
    }
  });

  return possibleMoves;
}

function simpleComputerMakesAMove(setGameState) {
  setTimeout(() => {
    setGameState(oldGameState => {
      const currentPlayer = oldGameState.currentPlayer;
      const grid = markAvailableCells(
        oldGameState.grid,
        oldGameState.currentPlayer,
      );

      // --------------------------------------------------------------------
      // console.log('Computer starts checking available moves...');

      const possibleMoves = R(grid, currentPlayer).filter(val => {
        return val.score >= 1;
      });

      const firstLessPossibleMoves = clone(possibleMoves);
      const firstPossibleMove = firstLessPossibleMoves.shift();
      const chosenCellData = firstLessPossibleMoves.reduce(
        (prev, curr) => (prev.score < curr.score ? curr : prev),
        firstPossibleMove,
      );

      const chosenCellCoords = chosenCellData.chosenCell;

      if (possibleMoves.length === 0) {
        return oldGameState;
      }

      // console.log(
      //   'Computer: chosen cell ' +
      //     chosenCellCoords[0] +
      //     ' ' +
      //     chosenCellCoords[1] +
      //     ' with score ' +
      //     chosenCellScore,
      // );

      // --------------------------------------------------------------------

      oldGameState.grid[chosenCellCoords[0]][chosenCellCoords[1]] =
        oldGameState.currentPlayer;
      const obtainedCells = obtainCells(
        oldGameState.grid,
        chosenCellCoords[0],
        chosenCellCoords[1],
        oldGameState.currentPlayer,
      );
      obtainedCells.forEach(el => {
        oldGameState.grid[el[0]][el[1]] = oldGameState.currentPlayer;
      });

      // console.log('Computer finished his move');

      return {
        ...oldGameState,
        score: getCurrentScore(oldGameState.grid),
        currentPlayer: enemyPlayerFor(oldGameState.currentPlayer),
      };
    });
  }, COMPUTER_DELAY);
}

function difficultComputerMakesAMove(setGameState) {
  setTimeout(() => {
    setGameState(oldGameState => {
      const currentPlayer = oldGameState.currentPlayer;
      const grid = markAvailableCells(
        oldGameState.grid,
        oldGameState.currentPlayer,
      );

      // --------------------------------------------------------------------
      // console.log('Computer starts checking available moves...');

      let possibleMoves = R(grid, currentPlayer).filter(val => {
        return val.score >= 1;
      });
      possibleMoves = possibleMoves.map((value, index, array) => {
        const predictedMoveOfCurrentPlayer = value.chosenCell;
        const nextPlayer = enemyPlayerFor(currentPlayer);
        let nextPlayerGrid = clone(grid);

        nextPlayerGrid[predictedMoveOfCurrentPlayer[0]][
          predictedMoveOfCurrentPlayer[1]
        ] = currentPlayer;

        const predictedObtainedCellsOfCurrentPlayer = obtainCells(
          nextPlayerGrid,
          predictedMoveOfCurrentPlayer[0],
          predictedMoveOfCurrentPlayer[1],
          currentPlayer,
        );
        predictedObtainedCellsOfCurrentPlayer.forEach(el => {
          nextPlayerGrid[el[0]][el[1]] = currentPlayer;
        });

        nextPlayerGrid = markAvailableCells(grid, nextPlayer);
        let possibleMovesForNextPlayer = R(nextPlayerGrid, nextPlayer);

        const chosenMoveForNextPlayerData = possibleMovesForNextPlayer.reduce(
          (prev, curr) => (prev.score < curr.score ? curr : prev),
        );

        const newScore = value.score - chosenMoveForNextPlayerData.score;

        const newObject = {
          ...value,
          score: newScore,
        };

        return newObject;
      });

      const firstLessPossibleMoves = clone(possibleMoves);
      const firstPossibleMove = firstLessPossibleMoves.shift();
      const chosenCellData = firstLessPossibleMoves.reduce(
        (prev, curr) => (prev.score < curr.score ? curr : prev),
        firstPossibleMove,
      );

      const chosenCellCoords = chosenCellData.chosenCell;
      const chosenCellScore = chosenCellData.score;

      if (possibleMoves.length === 0) {
        return oldGameState;
      }

      // console.log(
      //   'Computer: chosen cell ' +
      //     chosenCellCoords[0] +
      //     ' ' +
      //     chosenCellCoords[1] +
      //     ' with score ' +
      //     chosenCellScore,
      // );

      // --------------------------------------------------------------------

      oldGameState.grid[chosenCellCoords[0]][chosenCellCoords[1]] =
        oldGameState.currentPlayer;
      const obtainedCells = obtainCells(
        oldGameState.grid,
        chosenCellCoords[0],
        chosenCellCoords[1],
        oldGameState.currentPlayer,
      );
      obtainedCells.forEach(el => {
        oldGameState.grid[el[0]][el[1]] = oldGameState.currentPlayer;
      });

      return {
        ...oldGameState,
        score: getCurrentScore(oldGameState.grid),
        currentPlayer: enemyPlayerFor(oldGameState.currentPlayer),
      };
    });
  }, COMPUTER_DELAY);
}

function obtainCells(_grid, cellI, cellJ, player) {
  let grid = clone(_grid);
  const currentPlayer = player;
  const enemyPlayer = enemyPlayerFor(player);
  const capturedCells = [];
  CELL_OFFSETS.forEach(offset => {
    let i = cellI + offset[0];
    let j = cellJ + offset[1];

    while (isIndexValid(grid, i, j) && grid[i][j] === enemyPlayer) {
      i += offset[0];
      j += offset[1];
    }
    if (isIndexValid(grid, i, j) && grid[i][j] === currentPlayer) {
      i -= offset[0];
      j -= offset[1];
      while (i !== cellI || j !== cellJ) {
        capturedCells.push([i, j]);
        grid[i][j] = currentPlayer;
        i -= offset[0];
        j -= offset[1];
      }
    }
  });
  return capturedCells;
}

function cellIsAvailable(grid, i, j, player) {
  const enemyPlayer = enemyPlayerFor(player);
  let result = false;
  CELL_OFFSETS.every(offset => {
    if (
      isIndexValid(grid, i + offset[0], j + offset[1]) &&
      grid[i + offset[0]][j + offset[1]] === enemyPlayer
    ) {
      let newI = i + offset[0];
      let newJ = j + offset[1];
      while (isIndexValid(grid, newI, newJ)) {
        if (grid[newI][newJ] !== enemyPlayer) {
          break;
        }
        newI = newI + offset[0];
        newJ = newJ + offset[1];
      }

      result = isIndexValid(grid, newI, newJ) && grid[newI][newJ] === player;
      if (result) {
        return false;
      }
    }
    return true;
  });

  if (result) {
    const cells = obtainCells(grid, i, j, player);
    if (cells.length === 0) {
      result = false;
    }
  }

  return result;
}

function markAvailableCells(_grid, player) {
  let grid = clone(_grid);

  forEachElementInGridWhileReturnFalse(grid, (i, j, val) => {
    if (val === AVAILABLE_CELL) {
      grid[i][j] = EMPTY_CELL;
    }
    if (grid[i][j] === EMPTY_CELL && cellIsAvailable(grid, i, j, player)) {
      grid[i][j] = AVAILABLE_CELL;
    }
  });

  return grid;
}

function removeAvailableCells(_grid) {
  let grid = clone(_grid);

  forEachElementInGridWhileReturnFalse(grid, (i, j, val) => {
    if (val === AVAILABLE_CELL) {
      grid[i][j] = EMPTY_CELL;
    }
  });

  return grid;
}

const onCellPress = (gameState, setGameState, row, column) => {
  setGameState(oldGameState => {
    oldGameState.grid[row][column] = oldGameState.currentPlayer;
    const obtainedCells = obtainCells(
      oldGameState.grid,
      row,
      column,
      oldGameState.currentPlayer,
    );
    obtainedCells.forEach(el => {
      oldGameState.grid[el[0]][el[1]] = oldGameState.currentPlayer;
    });

    return {
      ...oldGameState,
      score: getCurrentScore(oldGameState.grid),
      currentPlayer: enemyPlayerFor(oldGameState.currentPlayer),
    };
  });
};

function forEachElementInGridWhileReturnFalse(grid, method) {
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const shouldEnd = method(i, j, grid[i][j]);
      if (shouldEnd) {
        return;
      }
    }
  }
}

function getCellColorFor(value) {
  switch (value) {
    case EMPTY_CELL:
      return 'white';
    case AVAILABLE_CELL:
      return '#DAF7A6';
    case PLAYER1:
      return '#FFC300';
    case PLAYER2:
      return '#FF5733';
    default:
      return 'red';
  }
}

function enemyPlayerFor(player) {
  return player === PLAYER1 ? PLAYER2 : PLAYER1;
}

function getEmptyGridState() {
  return new Array(FIELD_WIDTH)
    .fill(0)
    .map(() => new Array(FIELD_HEIGHT).fill(EMPTY_CELL));
}

function getInitialGridState() {
  const grid = new Array(FIELD_WIDTH)
    .fill(0)
    .map(() => new Array(FIELD_HEIGHT).fill(EMPTY_CELL));

  grid[FIELD_WIDTH / 2][FIELD_HEIGHT / 2] = PLAYER1;
  grid[FIELD_WIDTH / 2 - 1][FIELD_HEIGHT / 2 - 1] = PLAYER1;

  grid[FIELD_WIDTH / 2][FIELD_HEIGHT / 2 - 1] = PLAYER2;
  grid[FIELD_WIDTH / 2 - 1][FIELD_HEIGHT / 2] = PLAYER2;

  return grid;
}
function getEmptyGameState() {
  return {
    grid: getEmptyGridState(),
    currentPlayer: undefined,
    score: {PLAYER1: 0, PLAYER2: 0},
    gameStatus: GAME_NONE,
    gameMode: GAME_MODE_NONE,
  };
}

function getStartGameState(gameMode) {
  return {
    grid: getInitialGridState(),
    currentPlayer: PLAYER1,
    score: {PLAYER1: 0, PLAYER2: 0},
    gameStatus: GAME_IN_PROGRESS,
    gameMode: gameMode,
  };
}

const Cell = ({value, onPress}) => {
  return (
    <View
      style={{
        borderWidth: 1,
        aspectRatio: 1,
      }}>
      <TouchableOpacity
        disabled={value !== AVAILABLE_CELL}
        onPress={onPress}
        style={{
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: getCellColorFor(value),
        }}>
        {/*<Text>{value}</Text>*/}
      </TouchableOpacity>
    </View>
  );
};

function getCellScore(grid, i, j) {
  return isCellOnBorder(grid, i, j) ? 2 : 1;
}

function getCurrentScore(grid) {
  let p1Score = 0;
  let p2Score = 0;

  forEachElementInGridWhileReturnFalse(grid, (i, j, val) => {
    const cellScore = getCellScore(grid, i, j);
    if (val === PLAYER1) {
      p1Score += cellScore;
    } else if (val === PLAYER2) {
      p2Score += cellScore;
    }
  });

  return {
    PLAYER1: p1Score,
    PLAYER2: p2Score,
  };
}

function computerShouldMakeAMove(gameState) {
  // console.log('should computer make a move? ' + gameState.gameMode);
  return (
    (gameState.gameMode === GAME_MODE_EASY_PC ||
      gameState.gameMode === GAME_MODE_HARD_PC) &&
    gameState.currentPlayer === PLAYER2
  );
}

// let counter = 0;
const Grid = ({gameState, setGameState}) => {
  if (
    gameState.gameStatus === GAME_IN_PROGRESS &&
    !computerShouldMakeAMove(gameState)
  ) {
    gameState.grid = markAvailableCells(
      gameState.grid,
      gameState.currentPlayer,
    );
  } else {
    gameState.grid = removeAvailableCells(gameState.grid);
  }

  React.useEffect(() => {
    if (gameState.gameStatus === GAME_NONE) {
      setTimeout(() => {
        setGameState(getStartGameState(gameState.gameMode));
      }, GAME_START_DELAY);
      return;
    }

    const shouldComputerMakeMove = computerShouldMakeAMove(gameState);

    let gridContainsEmptyCells = false;
    forEachElementInGridWhileReturnFalse(gameState.grid, (i, j, val) => {
      if (val === EMPTY_CELL || val === AVAILABLE_CELL) {
        gridContainsEmptyCells = true;
        return true;
      }
    });

    let availableCellsForCurrentPlayer = 0;
    let availableCellsForEnemyPlayer = 0;
    const availableGridForCurrentPlayer = markAvailableCells(
      gameState.grid,
      gameState.currentPlayer,
    );
    const availableGridForEnemyPlayer = markAvailableCells(
      gameState.grid,
      enemyPlayerFor(gameState.currentPlayer),
    );

    forEachElementInGridWhileReturnFalse(
      availableGridForCurrentPlayer,
      (i, j, val) => {
        if (val === AVAILABLE_CELL) {
          availableCellsForCurrentPlayer++;
        }
      },
    );
    forEachElementInGridWhileReturnFalse(
      availableGridForEnemyPlayer,
      (i, j, val) => {
        if (val === AVAILABLE_CELL) {
          availableCellsForEnemyPlayer++;
        }
      },
    );

    // console.log(
    //   `${counter}) shouldComputerMakeMove: ${shouldComputerMakeMove}, gridContainsEmptyCells: ${gridContainsEmptyCells}, availableCellsForCurrentPlayer: ${availableCellsForCurrentPlayer}, availableCellsForEnemyPlayer: ${availableCellsForEnemyPlayer}`,
    // );
    // counter++;

    if (gameState.gameStatus === GAME_IN_PROGRESS) {
      if (
        !gridContainsEmptyCells ||
        availableCellsForCurrentPlayer === 0 ||
        availableCellsForEnemyPlayer === 0
      ) {
        setGameState(oldGameState => {
          return {
            ...oldGameState,
            gameStatus: GAME_FINISH,
          };
        });
      } else if (shouldComputerMakeMove) {
        if (gameState.gameMode === GAME_MODE_EASY_PC) {
          simpleComputerMakesAMove(setGameState);
        } else if (gameState.gameMode === GAME_MODE_HARD_PC) {
          difficultComputerMakesAMove(setGameState);
        }
      }
    }
  });

  return (
    <View
      style={{
        borderWidth: 1,
        flexDirection: 'row',
      }}>
      {gameState.grid.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={{
            flexDirection: 'column',
            flex: 1,
          }}>
          {row.map((item, columnIndex) => (
            <Cell
              key={columnIndex}
              value={item}
              onPress={() =>
                onCellPress(gameState, setGameState, rowIndex, columnIndex)
              }
            />
          ))}
        </View>
      ))}
    </View>
  );
};

let gameFinish = false;
const GameScreen = ({route, navigation}) => {
  const {gameMode} = route.params;
  const [gameState, setGameState] = React.useState(getEmptyGameState);
  gameState.gameMode = gameMode;

  if (gameState.gameStatus === GAME_FINISH) {
    gameFinish = true;
  }

  React.useEffect(() => {
    if (gameState.gameStatus === GAME_FINISH) {
      (async () => {
        const savedScore = await getData();
        let newScore;
        if (gameMode === GAME_MODE_PLAYER) {
          newScore =
            gameState.score.PLAYER1 > gameState.score.PLAYER2
              ? gameState.score.PLAYER1
              : gameState.score.PLAYER2;
        } else if (
          gameMode === GAME_MODE_EASY_PC ||
          gameMode === GAME_MODE_HARD_PC
        ) {
          newScore = gameState.score.PLAYER1;
        }
        if (!savedScore || newScore > savedScore) {
          await storeData(`${newScore}`);
        }
      })();
    }
  }, [
    gameMode,
    gameState.gameStatus,
    gameState.score.PLAYER1,
    gameState.score.PLAYER2,
  ]);

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingVertical: 40,
        flex: 1,
        justifyContent: 'center',
      }}>
      <View
        style={{
          flex: 2,
          justifyContent: 'center',
        }}>
        <Text
          style={{
            textAlign: 'center',
            alignSelf: 'center',
            fontSize: 24,
            fontWeight: 'bold',
          }}>
          {getTitleText(gameState)}
        </Text>
      </View>
      <View
        style={{
          flex: 8,
          justifyContent: 'center',
        }}>
        <Grid gameState={gameState} setGameState={setGameState} />
      </View>
      <View
        style={{
          flex: 2,
        }}>
        <Text
          style={{
            fontSize: 15,
          }}>
          <Text style={{color: getCellColorFor(PLAYER1)}}>■</Text>
          {' - Player 1\n'}
          <Text style={{color: getCellColorFor(PLAYER2)}}>■</Text>
          {' - Player 2\n'}
          <Text style={{color: getCellColorFor(AVAILABLE_CELL)}}>■</Text>
          {' - Available cell'}
        </Text>
      </View>
      <View
        style={{
          flex: 3,
        }}>
        {gameFinish && (
          <Button
            title="Go Back"
            onPress={() => {
              navigation.goBack();
              gameFinish = false;
            }}
          />
        )}
      </View>
    </View>
  );
};

const MenuScreen = ({navigation}) => {
  const [bestScore, setBestScore] = React.useState(undefined);

  useFocusEffect(
    React.useCallback(() => {
      getData().then(val => {
        setBestScore(val);
      });
    }, [setBestScore]),
  );

  return (
    <View style={styles.buttons}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignContent: 'center',
        }}>
        <Text
          style={{
            textAlign: 'center',
            fontSize: 40,
            fontWeight: '700',
          }}>
          Reversi
        </Text>
      </View>
      <View
        style={{
          flex: 7,
        }}>
        <Text
          style={{
            textAlign: 'center',
            fontSize: 15,
            color: 'gray',
            paddingBottom: 6,
          }}>
          {bestScore
            ? 'Best score: ' + bestScore
            : "You don't have a best score yet"}
        </Text>
        <Text
          style={{
            textAlign: 'center',
            fontSize: 19,
          }}>
          Start new game:
        </Text>
        <Button
          onPress={() =>
            navigation.push('Game', {
              name: 'Game VS PC (easy)',
              gameMode: GAME_MODE_EASY_PC,
            })
          }
          title="VS PC (easy)"
        />
        <Button
          onPress={() =>
            navigation.push('Game', {
              name: 'Game VS PC (hard)',
              gameMode: GAME_MODE_HARD_PC,
            })
          }
          title="VS PC (hard)"
        />
        <Button
          onPress={() =>
            navigation.push('Game', {
              name: 'Game VS Player',
              gameMode: GAME_MODE_PLAYER,
            })
          }
          title="VS Player"
        />
      </View>
    </View>
  );
};

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Menu" component={MenuScreen} />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={({route}) => ({
            title: route.params.name,
            headerShown: false,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  input: {
    margin: 8,
    padding: 10,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: 'white',
  },
  buttons: {
    flex: 1,
    justifyContent: 'center',
    padding: 8,
  },
  button: {
    margin: 8,
  },
});
