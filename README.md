Overall Architecture
Routes | Middleware | Controller | Repositories & Utils

Routes - Define the API endpoints
Middleware - Handle checks to make sure the requests to API are valid
Controller - Handle API requestsß
Repositories - Handle database queriess
Utils - Client for third party libraries. Third party libabraries made easy to use

Other Folders In The Project

Config - Configurations needed to make the API work

Project Structure
Currently every private route requires the request to have the auth token, csrf token
and the jwt token to be associated with the request. Once the jwt is verified the user id
from the jwt will also be stored in the request body so that at any point during the process
of the request, the api can access the current user's id.
