package com.schooldb.mobile.family

import com.schooldb.mobile.network.AuthenticatedApiClient
import org.json.JSONArray
import org.json.JSONObject

class FamilyRepository(
    private val api: AuthenticatedApiClient = AuthenticatedApiClient(),
) {
    private fun JSONObject.optionalText(key: String): String? =
        if (isNull(key)) null else optString(key).takeIf(String::isNotBlank)

    suspend fun dashboard(): FamilyDashboard {
        val data = api.get("api/v1/mobile/family/dashboard")
        val studentsJson = data.optJSONArray("students") ?: JSONArray()
        val students = buildList {
            repeat(studentsJson.length()) { index ->
                val item = studentsJson.getJSONObject(index)
                val enrollment = item.optJSONObject("enrollment")
                val attendance = item.getJSONObject("attendance")
                val homeworkJson = item.optJSONArray("recentHomework") ?: JSONArray()
                val homework = buildList {
                    repeat(homeworkJson.length()) { homeworkIndex ->
                        val row = homeworkJson.getJSONObject(homeworkIndex)
                        add(
                            FamilyHomework(
                                id = row.getString("id"),
                                title = row.optString("title", "Homework"),
                                subjectName = row.optString("subjectName", "General"),
                                dueDate = row.optString("dueDate"),
                            ),
                        )
                    }
                }

                add(
                    FamilyStudent(
                        id = item.getString("id"),
                        fullName = item.optString("fullName", "Student"),
                        admissionNo = item.optString("admissionNo"),
                        relationship = item.optString("relationship", "Student"),
                        className = enrollment?.optString("className")?.takeIf(String::isNotBlank),
                        sectionName = enrollment?.optString("sectionName")?.takeIf(String::isNotBlank),
                        academicYearName = enrollment?.optString("academicYearName")?.takeIf(String::isNotBlank),
                        rollNo = enrollment?.takeUnless { it.isNull("rollNo") }?.optInt("rollNo"),
                        attendanceAttended = attendance.optInt("attended"),
                        attendanceTotal = attendance.optInt("total"),
                        attendancePercentage = attendance.takeUnless { it.isNull("percentage") }
                            ?.optDouble("percentage"),
                        pendingHomeworkCount = item.optInt("pendingHomeworkCount"),
                        recentHomework = homework,
                        outstandingFee = item.optDouble("outstandingFee"),
                        completedResultCount = item.optInt("completedResultCount"),
                    ),
                )
            }
        }

        return FamilyDashboard(
            role = data.optString("role", "PARENT"),
            userName = data.optString("userName", "SchoolDB user"),
            schoolName = data.optString("schoolName", "SchoolDB"),
            students = students,
        )
    }

    suspend fun details(studentId: String): FamilyStudentDetails {
        val data = api.get("api/v1/mobile/family/student/$studentId/details")
        val attendanceJson = data.optJSONObject("attendance")
        val attendance = attendanceJson?.let {
            val summary = it.getJSONObject("summary")
            val recordsJson = it.optJSONArray("records") ?: JSONArray()
            FamilyAttendanceDetails(
                total = summary.optInt("total"),
                present = summary.optInt("present"),
                absent = summary.optInt("absent"),
                late = summary.optInt("late"),
                leave = summary.optInt("leave"),
                percentage = summary.optDouble("attendancePercentage"),
                records = buildList {
                    repeat(recordsJson.length()) { index ->
                        val item = recordsJson.getJSONObject(index)
                        add(
                            FamilyAttendanceRecord(
                                id = item.getString("id"),
                                date = item.optString("date"),
                                sessionType = item.optionalText("sessionType") ?: "DAILY",
                                subjectName = item.optionalText("subjectName"),
                                status = item.optString("status", "PRESENT"),
                                remarks = item.optionalText("remarks"),
                            ),
                        )
                    }
                },
            )
        }

        val homeworkJson = data.optJSONArray("homework") ?: JSONArray()
        val homework = buildList {
            repeat(homeworkJson.length()) { index ->
                val item = homeworkJson.getJSONObject(index)
                add(
                    FamilyHomeworkDetails(
                        id = item.getString("id"),
                        title = item.optString("title", "Homework"),
                        description = item.optionalText("description"),
                        subjectName = item.optString("subjectName", "General"),
                        assignedDate = item.optString("assignedDate"),
                        dueDate = item.optionalText("dueDate"),
                    ),
                )
            }
        }

        val feesJson = data.getJSONObject("fees")
        val feeSummary = feesJson.getJSONObject("summary")
        val installmentsJson = feesJson.optJSONArray("installments") ?: JSONArray()
        val paymentsJson = feesJson.optJSONArray("payments") ?: JSONArray()
        val fees = FamilyFeeDetails(
            payable = feeSummary.optDouble("payable"),
            paid = feeSummary.optDouble("paid"),
            outstanding = feeSummary.optDouble("outstanding"),
            installments = buildList {
                repeat(installmentsJson.length()) { index ->
                    val item = installmentsJson.getJSONObject(index)
                    add(
                        FamilyFeeInstallment(
                            id = item.getString("id"),
                            planName = item.optString("planName"),
                            categoryName = item.optString("categoryName"),
                            name = item.optString("name", "Installment"),
                            dueDate = item.optString("dueDate"),
                            payableAmount = item.optDouble("payableAmount"),
                            paidAmount = item.optDouble("paidAmount"),
                            outstanding = item.optDouble("outstanding"),
                            status = item.optString("status", "PENDING"),
                        ),
                    )
                }
            },
            payments = buildList {
                repeat(paymentsJson.length()) { index ->
                    val item = paymentsJson.getJSONObject(index)
                    add(
                        FamilyFeePayment(
                            id = item.getString("id"),
                            receiptNo = item.optionalText("receiptNo"),
                            paymentDate = item.optString("paymentDate"),
                            amount = item.optDouble("amount"),
                            paymentMode = item.optString("paymentMode"),
                        ),
                    )
                }
            },
        )

        val resultsJson = data.optJSONArray("results") ?: JSONArray()
        val results = buildList {
            repeat(resultsJson.length()) { index ->
                val item = resultsJson.getJSONObject(index)
                add(
                    FamilyResult(
                        id = item.getString("id"),
                        name = item.optString("name", "Exam"),
                        startDate = item.optString("startDate"),
                        endDate = item.optString("endDate"),
                        obtained = item.optDouble("obtained"),
                        maximum = item.optDouble("maximum"),
                        percentage = item.optDouble("percentage"),
                        status = item.optString("status", "PENDING"),
                    ),
                )
            }
        }

        val timetableJson = data.optJSONArray("timetable") ?: JSONArray()
        val timetable = buildList {
            repeat(timetableJson.length()) { index ->
                val item = timetableJson.getJSONObject(index)
                add(
                    FamilyTimetableEntry(
                        id = item.getString("id"),
                        day = item.optString("day"),
                        periodName = item.optString("periodName", "Period"),
                        displayOrder = item.optInt("displayOrder"),
                        startTime = item.optString("startTime"),
                        endTime = item.optString("endTime"),
                        subjectName = item.optString("subjectName", "Subject"),
                        teacherName = item.optString("teacherName", "Teacher"),
                    ),
                )
            }
        }

        val leaveJson = data.optJSONArray("leaveRequests") ?: JSONArray()
        val leaveRequests = buildList {
            repeat(leaveJson.length()) { index ->
                val item = leaveJson.getJSONObject(index)
                add(
                    FamilyLeaveRequest(
                        id = item.getString("id"),
                        startDate = item.optString("startDate"),
                        endDate = item.optString("endDate"),
                        reason = item.optString("reason"),
                        status = item.optString("status", "PENDING"),
                        decisionNote = item.optionalText("decisionNote"),
                        createdAt = item.optString("createdAt"),
                    ),
                )
            }
        }

        val calendarJson = data.optJSONArray("calendarEvents") ?: JSONArray()
        val calendarEvents = buildList {
            repeat(calendarJson.length()) { index ->
                val item = calendarJson.getJSONObject(index)
                add(
                    FamilyCalendarEvent(
                        id = item.getString("id"),
                        title = item.optString("title", "School event"),
                        description = item.optionalText("description"),
                        category = item.optString("category", "EVENT"),
                        startDate = item.optString("startDate"),
                        endDate = item.optString("endDate"),
                        targetLabel = item.optString("targetLabel", "School"),
                    ),
                )
            }
        }

        val transport = data.optJSONObject("transport")?.let { item ->
            val stopJson = item.getJSONObject("stop")
            val vehicleJson = item.optJSONObject("vehicle")
            val stopsJson = item.optJSONArray("stops") ?: JSONArray()
            FamilyTransportAssignment(
                pickupEnabled = item.optBoolean("pickupEnabled"),
                dropEnabled = item.optBoolean("dropEnabled"),
                startDate = item.optString("startDate"),
                notes = item.optionalText("notes"),
                routeCode = item.optString("routeCode"),
                routeName = item.optString("routeName", "School route"),
                routePickupStart = item.optionalText("routePickupStart"),
                routeDropStart = item.optionalText("routeDropStart"),
                stop = transportStop(stopJson),
                vehicle = vehicleJson?.let {
                    FamilyTransportVehicle(
                        registrationNo = it.optString("registrationNo"),
                        name = it.optionalText("name"),
                        type = it.optString("type", "BUS"),
                        driverName = it.optString("driverName"),
                        driverPhone = it.optString("driverPhone"),
                        attendantName = it.optionalText("attendantName"),
                        attendantPhone = it.optionalText("attendantPhone"),
                    )
                },
                stops = buildList {
                    repeat(stopsJson.length()) { index -> add(transportStop(stopsJson.getJSONObject(index))) }
                },
            )
        }

        return FamilyStudentDetails(
            attendance,
            homework,
            fees,
            results,
            timetable,
            leaveRequests,
            calendarEvents,
            transport,
        )
    }

    suspend fun submitLeave(studentId: String, startDate: String, endDate: String, reason: String) {
        api.post(
            "api/v1/mobile/family/student/$studentId/details",
            JSONObject()
                .put("startDate", startDate)
                .put("endDate", endDate)
                .put("reason", reason),
        )
    }

    suspend fun cancelLeave(studentId: String, requestId: String) {
        api.put(
            "api/v1/mobile/family/student/$studentId/details",
            JSONObject().put("requestId", requestId),
        )
    }

    suspend fun notifications(): Pair<Int, List<FamilyNotification>> {
        val data = api.get("api/v1/mobile/family/notifications")
        val rows = data.optJSONArray("items") ?: JSONArray()
        val items = buildList {
            repeat(rows.length()) { index ->
                val item = rows.getJSONObject(index)
                add(
                    FamilyNotification(
                        id = item.getString("id"),
                        title = item.optString("title", "School update"),
                        body = item.optString("body"),
                        category = item.optString("category", "GENERAL"),
                        priority = item.optString("priority", "NORMAL"),
                        targetLabel = item.optString("targetLabel", "School"),
                        publishedAt = item.optString("publishedAt"),
                        read = item.optBoolean("read"),
                    ),
                )
            }
        }
        return data.optInt("unreadCount") to items
    }

    suspend fun markNotificationRead(id: String) {
        api.post(
            "api/v1/mobile/family/notifications",
            JSONObject().put("id", id),
        )
    }

    private fun transportStop(json: JSONObject) = FamilyTransportStop(
        id = json.getString("id"),
        name = json.optString("name", "Stop"),
        sequence = if (json.has("sequence") && !json.isNull("sequence")) json.optInt("sequence") else null,
        pickupTime = json.optionalText("pickupTime"),
        dropTime = json.optionalText("dropTime"),
        monthlyFee = if (json.has("monthlyFee") && !json.isNull("monthlyFee")) json.optDouble("monthlyFee") else null,
    )
}
