/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useLayoutEffect } from 'react';
import type { Decorator } from '@storybook/react-vite';

type VeraGlobal = Record<string, unknown>;
type VeraWindow = { vera?: VeraGlobal };

export function withScopedVeraBridge(bridge: VeraGlobal): Decorator {
  return (Story) => {
    const target = window as unknown as VeraWindow;
    useLayoutEffect(() => {
      const hadPrevious = 'vera' in target;
      const previous = target.vera;
      target.vera = bridge;
      return () => {
        if (target.vera === bridge) {
          if (hadPrevious) {
            target.vera = previous;
          } else {
            delete target.vera;
          }
        }
      };
    }, []);
    return <Story />;
  };
}