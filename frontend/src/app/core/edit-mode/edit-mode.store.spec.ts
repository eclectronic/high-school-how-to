import { TestBed } from '@angular/core/testing';
import { EditModeStore } from './edit-mode.store';

describe('EditModeStore', () => {
  let store: EditModeStore;

  beforeEach(() => {
    // Clear localStorage before each test so state doesn't bleed across
    localStorage.removeItem('hsht.editMode');

    TestBed.configureTestingModule({
      providers: [EditModeStore],
    });
    store = TestBed.inject(EditModeStore);
  });

  afterEach(() => {
    localStorage.removeItem('hsht.editMode');
  });

  // ── enabled signal ────────────────────────────────────────────────────────────

  it('starts with enabled=false when localStorage is empty', () => {
    expect(store.enabled()).toBeFalse();
  });

  it('hydrates enabled=true from localStorage on construction', () => {
    localStorage.setItem('hsht.editMode', '1');
    // Re-create so the constructor runs with the stored value
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [EditModeStore] });
    const hydratedStore = TestBed.inject(EditModeStore);
    expect(hydratedStore.enabled()).toBeTrue();
  });

  // ── toggle() ──────────────────────────────────────────────────────────────────

  it('toggle() flips enabled from false to true', () => {
    expect(store.enabled()).toBeFalse();
    store.toggle();
    expect(store.enabled()).toBeTrue();
  });

  it('toggle() flips enabled from true to false', () => {
    store.toggle(); // false -> true
    store.toggle(); // true -> false
    expect(store.enabled()).toBeFalse();
  });

  it('toggle() writes to localStorage when enabling', () => {
    store.toggle();
    expect(localStorage.getItem('hsht.editMode')).toBe('1');
  });

  it('toggle() removes localStorage key when disabling', () => {
    store.toggle(); // enable
    store.toggle(); // disable
    expect(localStorage.getItem('hsht.editMode')).toBeNull();
  });

  // ── enable() / disable() ─────────────────────────────────────────────────────

  it('enable() sets enabled to true', () => {
    store.enable();
    expect(store.enabled()).toBeTrue();
  });

  it('disable() sets enabled to false and clears dirty state', () => {
    store.enable();
    store.markDirty({ id: 1, status: 'DRAFT' });
    store.disable();
    expect(store.enabled()).toBeFalse();
    expect(store.dirtyCard()).toBeNull();
  });

  // ── markDirty() / isDirty ────────────────────────────────────────────────────

  it('markDirty() sets dirtyCard', () => {
    store.markDirty({ id: 5, title: 'My Card' });
    expect(store.dirtyCard()).toEqual(jasmine.objectContaining({ id: 5, title: 'My Card' }));
  });

  it('markDirty() merges with existing dirtyCard', () => {
    store.markDirty({ id: 1 });
    store.markDirty({ status: 'PUBLISHED' });
    const dirty = store.dirtyCard();
    expect(dirty).toEqual(jasmine.objectContaining({ id: 1, status: 'PUBLISHED' }));
  });

  it('isDirty() returns false when dirtyCard is null', () => {
    expect(store.isDirty()).toBeFalse();
  });

  it('isDirty() returns true when dirtyCard is set', () => {
    store.markDirty({ id: 1 });
    expect(store.isDirty()).toBeTrue();
  });

  // ── discard() ────────────────────────────────────────────────────────────────

  it('discard() clears dirtyCard', () => {
    store.markDirty({ id: 1 });
    store.discard();
    expect(store.dirtyCard()).toBeNull();
    expect(store.isDirty()).toBeFalse();
  });

  it('discard() clears lastError', () => {
    store.setError('Something went wrong');
    store.discard();
    expect(store.lastError()).toBeNull();
  });

  // ── commit() ─────────────────────────────────────────────────────────────────

  it('commit() clears dirtyCard', () => {
    store.markDirty({ id: 1 });
    store.commit({ id: 1 });
    expect(store.dirtyCard()).toBeNull();
  });

  it('commit() clears lastError', () => {
    store.setError('Save failed');
    store.commit({ id: 1 });
    expect(store.lastError()).toBeNull();
  });

  // ── requestSave() / pendingSave ───────────────────────────────────────────────

  it('requestSave() increments pendingSave', () => {
    const before = store.pendingSave();
    store.requestSave();
    expect(store.pendingSave()).toBe(before + 1);
  });

  it('requestSave() increments pendingSave multiple times', () => {
    store.requestSave();
    store.requestSave();
    store.requestSave();
    expect(store.pendingSave()).toBe(3);
  });

  // ── setError() / lastError ────────────────────────────────────────────────────

  it('setError() sets lastError', () => {
    store.setError('Network error');
    expect(store.lastError()).toBe('Network error');
  });

  it('setError(null) clears lastError', () => {
    store.setError('Error');
    store.setError(null);
    expect(store.lastError()).toBeNull();
  });

  // ── clearOnLogout() ───────────────────────────────────────────────────────────

  it('clearOnLogout() disables edit mode', () => {
    store.enable();
    store.clearOnLogout();
    expect(store.enabled()).toBeFalse();
  });

  it('clearOnLogout() clears dirty state', () => {
    store.markDirty({ id: 2 });
    store.clearOnLogout();
    expect(store.dirtyCard()).toBeNull();
    expect(store.isDirty()).toBeFalse();
  });
});
