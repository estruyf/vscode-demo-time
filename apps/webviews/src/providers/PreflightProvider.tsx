import { createContext } from 'react';
import { ActProblem } from '@demotime/common';

/**
 * The preflight problems of the act in the act editor
 */
export const PreflightContext = createContext<ActProblem[]>([]);

export const PreflightProvider = PreflightContext.Provider;
