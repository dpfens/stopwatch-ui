import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StopwatchSettingsComponent } from './stopwatch-settings.component';

describe('StopwatchSettingsComponent', () => {
  let component: StopwatchSettingsComponent;
  let fixture: ComponentFixture<StopwatchSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StopwatchSettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StopwatchSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
