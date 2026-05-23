import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useFileSelection } from '../../src/hooks/use-file-selection'

describe('useFileSelection', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useFileSelection())
    expect(result.current.count).toBe(0)
    expect(result.current.selected.size).toBe(0)
    expect(result.current.has('foo')).toBe(false)
  })

  it('toggle adds a key when not selected', () => {
    const { result } = renderHook(() => useFileSelection())
    act(() => result.current.toggle('a'))
    expect(result.current.count).toBe(1)
    expect(result.current.has('a')).toBe(true)
  })

  it('toggle removes a key when already selected', () => {
    const { result } = renderHook(() => useFileSelection())
    act(() => result.current.toggle('a'))
    act(() => result.current.toggle('a'))
    expect(result.current.count).toBe(0)
    expect(result.current.has('a')).toBe(false)
  })

  it('clear empties selection', () => {
    const { result } = renderHook(() => useFileSelection())
    act(() => {
      result.current.toggle('a')
      result.current.toggle('b')
    })
    expect(result.current.count).toBe(2)
    act(() => result.current.clear())
    expect(result.current.count).toBe(0)
  })

  it('selectAll replaces selection with given keys', () => {
    const { result } = renderHook(() => useFileSelection())
    act(() => result.current.toggle('x'))
    act(() => result.current.selectAll(['a', 'b', 'c']))
    expect(result.current.count).toBe(3)
    expect(result.current.has('a')).toBe(true)
    expect(result.current.has('b')).toBe(true)
    expect(result.current.has('c')).toBe(true)
    expect(result.current.has('x')).toBe(false)
  })

  it('selectAll with empty array clears', () => {
    const { result } = renderHook(() => useFileSelection())
    act(() => result.current.toggle('a'))
    act(() => result.current.selectAll([]))
    expect(result.current.count).toBe(0)
  })
})
