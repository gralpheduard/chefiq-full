import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CookbookPage } from './cookbook.page';

describe('CookbookPage', () => {
  let component: CookbookPage;
  let fixture: ComponentFixture<CookbookPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CookbookPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
