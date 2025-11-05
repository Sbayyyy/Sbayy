FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
# Copy project file and restore dependencies (cached until .csproj changes)
COPY SBay.Backend.csproj ./
RUN dotnet restore SBay.Backend.csproj

# Copy remaining source and build
COPY . .
RUN dotnet publish SBay.Backend.csproj -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /out .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet","SBay.Backend.dll"]
