/*
 * SonarQube, open source software quality management tool.
 * Copyright (C) 2008-2014 SonarSource
 * mailto:contact AT sonarsource DOT com
 *
 * SonarQube is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * SonarQube is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

package org.sonar.server.computation.metric;

import com.google.common.collect.ImmutableSet;
import java.util.Collections;
import org.junit.Rule;
import org.junit.Test;
import org.sonar.api.measures.Metric;
import org.sonar.api.utils.log.LogTester;
import org.sonar.core.metric.SensorMetrics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.sonar.api.measures.Metric.Builder;
import static org.sonar.api.measures.Metric.ValueType;

public class ReportMetricValidatorImplTest {

  @Rule
  public LogTester logTester = new LogTester();

  static final String METRIC_KEY = "metric_key";

  SensorMetrics sensorMetrics = mock(SensorMetrics.class);

  @Test
  public void validate_metric() throws Exception {
    when(sensorMetrics.getMetrics()).thenReturn(ImmutableSet.<Metric>of(new Builder(METRIC_KEY, "name", ValueType.INT).create()));
    ReportMetricValidator validator = new ReportMetricValidatorImpl(sensorMetrics);

    assertThat(validator.validate(METRIC_KEY)).isTrue();
    assertThat(logTester.logs()).isEmpty();
  }

  @Test
  public void not_validate_metric() throws Exception {
    when(sensorMetrics.getMetrics()).thenReturn(Collections.<Metric>emptySet());
    ReportMetricValidator validator = new ReportMetricValidatorImpl(sensorMetrics);

    assertThat(validator.validate(METRIC_KEY)).isFalse();
    assertThat(logTester.logs()).containsOnly("The metric 'metric_key' is ignored and should not be send in the batch report");
  }

  @Test
  public void not_generate_new_log_when_validating_twice_the_same_metric() throws Exception {
    when(sensorMetrics.getMetrics()).thenReturn(Collections.<Metric>emptySet());
    ReportMetricValidator validator = new ReportMetricValidatorImpl(sensorMetrics);

    assertThat(validator.validate(METRIC_KEY)).isFalse();
    assertThat(logTester.logs()).hasSize(1);
    assertThat(validator.validate(METRIC_KEY)).isFalse();
    assertThat(logTester.logs()).hasSize(1);
  }
}
