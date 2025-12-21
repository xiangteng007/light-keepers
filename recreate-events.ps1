$headers = @{
    "Content-Type" = "application/json; charset=utf-8"
}

# Delete old events
$oldEvents = @(
    "99ebec6e-f1c3-49b7-9e59-8ff77bfa3373",
    "bb836b02-052f-40fb-b183-218ca6319e1d",
    "8b5ca3eb-5ab3-4d00-b434-a1f26854bfe4",
    "98516876-c535-431c-b317-ebbb86fee832",
    "ff9ad935-1901-4e6b-9ae2-981f5399f961",
    "0493eeff-2e70-4bc6-a48c-be5f494a18df",
    "7b8c666e-8c99-4fc0-8626-acce8f9ea5ac",
    "add9efa6-6d3a-4ed3-9242-4d6c3f45b6b4"
)

foreach ($id in $oldEvents) {
    try {
        Invoke-RestMethod -Uri "https://light-keepers-api-955234851806.asia-east1.run.app/api/v1/events/$id" -Method DELETE -Headers $headers
        Write-Host "Deleted: $id"
    } catch {
        Write-Host "Failed to delete: $id - $($_.Exception.Message)"
    }
}

Write-Host "Deletion complete. Now creating new events..."

# Create new events with proper encoding
$events = @(
    @{
        title = "Taipei Landslide Alert"
        description = "Potential landslide risk in Taipei Daan District after heavy rainfall"
        category = "Landslide"
        severity = 4
        status = "active"
        latitude = 25.0225
        longitude = 121.5429
        address = "Taipei Daan District"
    },
    @{
        title = "New Taipei Flood Warning"
        description = "Flooding reported in New Taipei Sanxia District"
        category = "Flood"
        severity = 3
        status = "active"
        latitude = 24.9356
        longitude = 121.3694
        address = "New Taipei Sanxia"
    },
    @{
        title = "Taichung Earthquake"
        description = "Earthquake magnitude 5.2 detected in Taichung Wufeng area"
        category = "Earthquake"
        severity = 5
        status = "active"
        latitude = 24.0612
        longitude = 120.7003
        address = "Taichung Wufeng"
    },
    @{
        title = "Kaohsiung Road Collapse"
        description = "Road collapse in Kaohsiung Meinong area"
        category = "Collapse"
        severity = 4
        status = "active"
        latitude = 22.8983
        longitude = 120.5418
        address = "Kaohsiung Meinong"
    },
    @{
        title = "Hualien Forest Fire"
        description = "Forest fire reported in Hualien Xiulin Township"
        category = "Fire"
        severity = 5
        status = "active"
        latitude = 24.1615
        longitude = 121.4924
        address = "Hualien Xiulin"
    }
)

foreach ($event in $events) {
    $json = $event | ConvertTo-Json -Compress
    try {
        $response = Invoke-RestMethod -Uri "https://light-keepers-api-955234851806.asia-east1.run.app/api/v1/events" -Method POST -Body $json -Headers $headers
        Write-Host "Created: $($response.title)"
    } catch {
        Write-Host "Failed: $($_.Exception.Message)"
    }
}

Write-Host "All events created!"
