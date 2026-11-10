import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, appType: 'custom', server: { middlewareMode: true, ws: false } });
after(() => server.close());
const { SolitaireEngine } = await server.ssrLoadModule('/src/engine/SolitaireEngine.ts');
const { Card } = await server.ssrLoadModule('/src/engine/Card.ts');

const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const tableau = (index, cardIndex) => ({ type: 'tableau', index, cardIndex });
const foundation = index => ({ type: 'foundation', index });
const reserve = { type: 'reserve', index: 0 };

function challenge(deal) {
  const engine = new SolitaireEngine(3);
  engine.initSixSeals(deal);
  assert.equal(engine.drawMode, 1);
  const cards = [...engine.tableau.flat(), ...engine.foundations.flat()];
  assert.equal(cards.length, 52);
  assert.equal(new Set(cards.map(card => card.id)).size, 52);
  return engine;
}

function move(engine, from, to) {
  assert.ok(engine.moveCards(from, to), JSON.stringify({ from, to }));
}

function finishCourts(engine) {
  for (const [index, column] of engine.tableau.entries()) {
    while (column.length) move(engine, tableau(index), foundation(suits.indexOf(column.at(-1).suit)));
  }
  assert.ok(engine.gameWon);
}

test('Spend: the first move needs the reserve, and retry restores the puzzle', () => {
  const engine = challenge('spend');
  const opening = engine.takeSnapshot();
  assert.deepEqual(engine.findHint()?.to, reserve);
  assert.equal(engine.tryAutoMove(tableau(0)), false);
  move(engine, tableau(0), reserve);
  assert.equal(engine.seals.reserve.rank, 12);
  assert.equal(engine.tableau[0].at(-1).rank, 11);
  assert.equal(engine.isValidMove(tableau(0), reserve), false);
  assert.ok(engine.undo());
  assert.deepEqual(engine.takeSnapshot(), opening);
  assert.ok(engine.redo());
  move(engine, tableau(0), foundation(0));
  move(engine, reserve, foundation(0));
  finishCourts(engine);
  assert.equal(engine.seals.spent, 1);
  engine.retryDeal();
  assert.deepEqual(engine.takeSnapshot(), opening);
});

test('Save: parking the opening Jack strands the deal, while saving the seal wins', () => {
  const engine = challenge('save');
  assert.deepEqual(engine.findHint()?.to, foundation(2));
  move(engine, tableau(0), reserve);
  move(engine, reserve, foundation(2));
  assert.equal(engine.findHint(), null);
  assert.equal(engine.gameWon, false);

  engine.retryDeal();
  move(engine, tableau(0), foundation(2));
  assert.deepEqual(engine.findHint()?.to, reserve);
  move(engine, tableau(0), reserve);
  move(engine, tableau(0), foundation(3));
  move(engine, reserve, foundation(3));
  finishCourts(engine);
  assert.equal(engine.seals.spent, 1);
});

test('Skip: all four courts can finish with the opening seal unspent', () => {
  const engine = challenge('skip');
  finishCourts(engine);
  assert.equal(engine.seals.spent, 0);
  assert.equal(engine.seals.available, 1);
});

test('Milestone awards survive undo and redo and cannot be earned again after reversal', () => {
  const engine = new SolitaireEngine();
  engine.initSixSeals('full');
  const snapshot = engine.takeSnapshot();
  snapshot.stock = [];
  snapshot.waste = [];
  snapshot.foundations = suits.map((suit, index) => {
    return Array.from({ length: index === 3 ? 1 : 2 }, (_, rank) => new Card(suit, rank + 1, true));
  });
  snapshot.tableau = [[new Card('hearts', 3, true), new Card('spades', 2, true)], [], [], [], [], [], []];
  engine.restoreSnapshot(snapshot);
  assert.equal(engine.isValidMove(tableau(0, 0), reserve), false);
  assert.equal(engine.isValidMove(foundation(0), reserve), false);
  move(engine, tableau(0), foundation(3));
  assert.equal(engine.seals.available, 2);
  assert.ok(engine.undo());
  assert.equal(engine.seals.available, 1);
  assert.ok(engine.redo());
  assert.equal(engine.seals.available, 2);
  move(engine, foundation(3), tableau(0));
  move(engine, tableau(0), foundation(3));
  assert.equal(engine.seals.available, 2);
  move(engine, tableau(0), reserve);
  assert.equal(engine.seals.available, 1);
  assert.ok(engine.undo());
  assert.equal(engine.seals.reserve, null);
  assert.equal(engine.seals.available, 2);
  assert.ok(engine.redo());
  assert.equal(engine.seals.spent, 1);
  assert.equal(engine.seals.reserve.rank, 3);
});

test('Classic remains a fresh Draw 3 deal with no reserve', () => {
  const engine = challenge('save');
  engine.initGame(3);
  assert.equal(engine.seals, null);
  assert.equal(engine.sixSealsDeal, null);
  assert.deepEqual(engine.tableau.map(column => column.length), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(engine.stock.length, 24);
  assert.ok(engine.drawStock());
  assert.equal(engine.waste.length, 3);
  assert.equal(engine.isValidMove({ type: 'waste', index: 0 }, reserve), false);
});
