import { isTuringRule, type Machine, type Rule } from './types';

/** One rule as one line of a standard description (Turing 1936, section 5). */
export interface StandardLine {
  /** The rule's place in `machine.rules`, from 0. */
  ruleIndex: number;
  /** Turing's first standard form, such as "q1 S0 S1 R q2". */
  standardForm: string;
  /** The line in letters, with its semicolon: "DADDCRDAA;". */
  sd: string;
  /** The same line in digits: "3133253117". */
  dn: string;
}

export interface StandardDescription {
  /** The machine's states in Turing's order: states[0] is q1, states[1] is q2, and so on. */
  states: string[];
  lines: StandardLine[];
  /** The standard description (S.D): every line, in the order of the rules. */
  sd: string;
  /** The description number (D.N): the S.D with each letter replaced by its digit. */
  dn: string;
}

/** p. 240: "A" by "1", "C" by "2", "D" by "3", "L" by "4", "R" by "5", "N" by "6", and ";" by "7". */
const DIGITS: Record<string, string> = { A: '1', C: '2', D: '3', L: '4', R: '5', N: '6', ';': '7' };

/** One rule in the form q_i S_j S_k M q_m, before the numbers are spelled out. */
interface NumberedLine {
  state: number;
  read: number;
  write: number;
  move: 'L' | 'R' | 'N';
  next: number;
}

/** The rule's operations as Turing writes them, so a modern rule ("write 0, move S") reads ["P0"]. */
function opsOf(rule: Rule): string[] {
  if (isTuringRule(rule)) return rule.ops;
  return rule.move === 'S' ? [`P${rule.write}`] : [`P${rule.write}`, rule.move];
}

/**
 * Writes a machine as Turing's standard description and description number (section 5, pp. 239–241).
 * The start state is q1 and the other states follow in the order the rules name them. The blank is
 * S0, "0" is S1 and "1" is S2; other symbols follow from S3 in the order the rules name them.
 * The lines keep the order of the rules. Throws for a rule that is not one print and one move,
 * or that reads "any symbol": section 5 first rewrites such rules into simpler ones.
 */
export function standardDescription(machine: Machine): StandardDescription {
  const states = [machine.start];
  const stateNumber = (state: string) => {
    if (!states.includes(state)) states.push(state);
    return states.indexOf(state) + 1;
  };
  const symbols = [machine.blank, '0', '1'];
  const symbolNumber = (symbol: string) => {
    if (!symbols.includes(symbol)) symbols.push(symbol);
    return symbols.indexOf(symbol);
  };

  const numbered = machine.rules.map((rule, index): NumberedLine => {
    if (typeof rule.read !== 'string' && rule.read.match === 'any') throw new Error(`rule ${index + 1} reads any symbol`);
    const state = stateNumber(rule.state);
    const read = symbolNumber(typeof rule.read === 'string' ? rule.read : machine.blank);
    const ops = opsOf(rule);
    // p. 240: a line prints, then moves once at most. "E" prints the blank; no print keeps the symbol read.
    const isMove = (op: string | undefined) => op === 'L' || op === 'R';
    const print = isMove(ops[0]) ? undefined : ops[0];
    const moves = print === undefined ? ops : ops.slice(1);
    if ((print !== undefined && print !== 'E' && !/^P.$/u.test(print)) || moves.length > 1 || (moves.length === 1 && !isMove(moves[0]))) {
      throw new Error(`rule ${index + 1} cannot be written as one line of a standard description: ${ops.join(', ')}`);
    }
    const write = print === undefined ? read : print === 'E' ? 0 : symbolNumber([...print][1]);
    const move = moves[0] === 'L' || moves[0] === 'R' ? moves[0] : 'N';
    return { state, read, write, move, next: stateNumber(rule.next) };
  });

  const lines = numbered.map(({ state, read, write, move, next }, ruleIndex): StandardLine => {
    // p. 240: q_i becomes "D" and i times "A"; S_j becomes "D" and j times "C".
    const sd = `D${'A'.repeat(state)}D${'C'.repeat(read)}D${'C'.repeat(write)}${move}D${'A'.repeat(next)};`;
    return {
      ruleIndex,
      standardForm: `q${state} S${read} S${write} ${move} q${next}`,
      sd,
      dn: [...sd].map((letter) => DIGITS[letter]).join(''),
    };
  });

  return { states, lines, sd: lines.map((line) => line.sd).join(''), dn: lines.map((line) => line.dn).join('') };
}
