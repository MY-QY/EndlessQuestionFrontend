"use client";
import { Button, Select } from "antd";
import { CheckOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { monthCalendar } from "@/lib/sign-calendar";

export function SignCalendar({
  month,
  records,
  onChange,
  status,
}: {
  month: Dayjs;
  records: number[];
  onChange: (month: Dayjs) => void;
  status?: React.ReactNode;
}) {
  const today = dayjs();
  const calendar = monthCalendar(month, records, today);
  return (
    <>
      <div className="calendar-toolbar">
        <div className="calendar-navigation">
          <Button
            aria-label="上一月"
            icon={<LeftOutlined />}
            onClick={() => onChange(month.subtract(1, "month"))}
          />
          <h3 aria-live="polite">{month.format("YYYY 年 M 月")}</h3>
          <Button
            aria-label="下一月"
            icon={<RightOutlined />}
            onClick={() => onChange(month.add(1, "month"))}
          />
        </div>
        <div className="calendar-year-actions">
          <Select
            aria-label="选择年份"
            value={month.year()}
            onChange={(year) => onChange(month.year(year).startOf("month"))}
            options={Array.from(
              { length: 6 },
              (_, index) => today.year() - index,
            )
              .concat(month.year())
              .filter((year, index, years) => years.indexOf(year) === index)
              .sort((a, b) => b - a)
              .map((year) => ({ value: year, label: `${year} 年` }))}
          />
          <Button
            onClick={() => onChange(today.startOf("month"))}
            disabled={month.isSame(today, "month")}
          >
            回到本月
          </Button>
        </div>
      </div>
      {status || (
        <>
          <div className="calendar-stats">
            <span>
              本月签到 <strong>{calendar.monthCount}</strong> 天
            </span>
            <span>
              本年签到 <strong>{calendar.yearCount}</strong> 天
            </span>
          </div>
          <div
            className="sign-calendar"
            role="table"
            aria-label={`${month.format("YYYY 年 M 月")}签到日历`}
          >
            <div className="calendar-week" role="row">
              {["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map(
                (day) => (
                  <span role="columnheader" key={day}>
                    {day}
                  </span>
                ),
              )}
            </div>
            {Array.from({ length: calendar.cells.length / 7 }, (_, week) => (
              <div className="calendar-week" role="row" key={week}>
                {calendar.cells
                  .slice(week * 7, week * 7 + 7)
                  .map((date, index) =>
                    date ? (
                      <div
                        role="cell"
                        key={date.date}
                        aria-current={date.today ? "date" : undefined}
                        aria-label={`${date.date}${date.today ? "，今天" : ""}，${date.signed ? "已签到" : date.future ? "未来日期" : "未签到"}`}
                        className={`calendar-day ${date.signed ? "is-signed" : ""} ${date.today ? "is-today" : ""} ${date.future ? "is-future" : ""}`}
                      >
                        <div className="calendar-date">
                          <span>{date.day}</span>
                          {date.today && <small>今天</small>}
                        </div>
                        {date.signed && (
                          <span className="calendar-check">
                            <CheckOutlined />
                            <span>已签到</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <div
                        role="cell"
                        className="calendar-blank"
                        key={`empty-${index}`}
                        aria-label="非本月日期"
                      />
                    ),
                  )}
              </div>
            ))}
          </div>
          <div className="calendar-legend">
            <span>
              <i className="legend-signed" />
              已签到
            </span>
            <span>
              <i className="legend-today" />
              今天
            </span>
            <span>
              <i className="legend-future" />
              未来日期
            </span>
          </div>
        </>
      )}
    </>
  );
}
