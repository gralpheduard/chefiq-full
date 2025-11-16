import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CookModePage } from './cook-mode.page';

describe('CookModePage', () => {
  let component: CookModePage;
  let fixture: ComponentFixture<CookModePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CookModePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
