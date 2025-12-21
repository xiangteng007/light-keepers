# Update events to Traditional Chinese
$headers = @{
    "Content-Type" = "application/json; charset=utf-8"
}

# Event updates
$updates = @(
    @{
        id          = "0720e902-a798-4c63-abe5-7738ee832c2b"
        title       = "台北土石流警報"
        description = "大安區連日大雨後土石流風險升高"
        category    = "土石流"
        address     = "台北市大安區"
    },
    @{
        id          = "14559d73-16df-4584-943b-4b4826f27ca7"
        title       = "新北淹水警報"
        description = "三峽區發生淹水災情"
        category    = "淹水"
        address     = "新北市三峽區"
    },
    @{
        id          = "252119bb-5c01-4758-b58c-79d79900424c"
        title       = "台中地震警報"
        description = "霧峰區偵測到規模5.2地震"
        category    = "地震"
        address     = "台中市霧峰區"
    },
    @{
        id          = "9ddff80f-2a02-4a00-8c6f-47d4dc8851d4"
        title       = "高雄道路坍方"
        description = "美濃區道路坍方事件"
        category    = "坍方"
        address     = "高雄市美濃區"
    },
    @{
        id          = "51a2419e-a1f2-47f6-a08d-cf1a72a5008f"
        title       = "花蓮森林火災"
        description = "秀林鄉發生森林火災"
        category    = "火災"
        address     = "花蓮縣秀林鄉"
    }
)

foreach ($update in $updates) {
    $id = $update.id
    $body = @{
        title       = $update.title
        description = $update.description
        category    = $update.category
        address     = $update.address
    } | ConvertTo-Json -Compress
    
    try {
        $response = Invoke-RestMethod -Uri "https://light-keepers-api-955234851806.asia-east1.run.app/api/v1/events/$id" -Method PUT -Body $body -Headers $headers
        Write-Host "Updated: $($update.title)"
    }
    catch {
        Write-Host "Failed: $($_.Exception.Message)"
    }
}

Write-Host "All events updated to Traditional Chinese!"
