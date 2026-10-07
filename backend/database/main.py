import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

# read in the CREATE TABLE commands from table_definitions.ddl and split the file by ";" so
# that we can execute the commands one at a time
ddl_file = open("table_definitions.ddl", "r")
ddl_data = ddl_file.read()
ddl_file.close()
sql_commands = ddl_data.split(";")

# get the database URL from the env file and parse the required parameters so that we can
# create a connection to the database
load_dotenv()

DATABASE_URL = urlparse(os.environ["DATABASE_URL"])
username = DATABASE_URL.username
password = DATABASE_URL.password
database = DATABASE_URL.path[1:]
hostname = DATABASE_URL.hostname
port = DATABASE_URL.port
db_connection = psycopg2.connect(
    database = database,
    user = username,
    password = password,
    host = hostname,
    port = port
)
cur = db_connection.cursor()

# run each SQL command
for command in sql_commands:
    if command.strip() != "":
        cur.execute(command)
        command = command + ";"
        cur.execute(command)
        db_connection.commit()

# close the connection to the database
cur.close()
db_connection.close()